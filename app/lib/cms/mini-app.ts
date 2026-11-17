import { createHmac, timingSafeEqual } from "node:crypto";
import type { Api } from "grammy";
import type { ChatMember } from "grammy/types";
import { CmsError, ensure, type Actor } from "./actor";
import { telegramToken } from "./telegram";
import * as tracker from "./tracker";
import type { ProjectGroup } from "./tracker";

/*
 * The tracker Mini App's server side. Telegram opens the app with `initData`, a query string it signs
 * with the bot token. Every request carries it (`Authorization: tma <initData>`), and we check the
 * signature each time, so there is no session to steal or expire.
 *
 * Who may see what is decided here, never by the launch link: a link can be forwarded or typed by hand.
 *  - A DAP exco is recognised by their linked Telegram ID and may open every project group.
 *  - Anyone else gets a project group only if Telegram says (getChatMember) they are in that group's
 *    connected chat, which is the same "everyone in the chat is a member" rule the bot uses.
 */

/** Telegram recommends rejecting old launches; an hour covers a normal session, after which the app is reopened. */
export const MAX_AGE_SECONDS = 3600;
/** A launch dated a little in the future is clock skew; much further is forged. */
const SKEW_SECONDS = 300;
/** How long an answer from getChatMember is reused, so one session doesn't ask Telegram on every request. */
const CACHE_MS = 60_000;

export interface Launch {
  user: { id: number; name: string; username: string };
  authDate: number;
  /** What the launch link carried after startapp= (g3: project group 3). Only a hint, never trusted for access. */
  startParam: string;
  /** "group", "supergroup", "private", "sender"…: where the link was opened. Empty for other launches. */
  chatType: string;
}

/** Thrown for a launch we won't trust; the message is safe to show. */
export class LaunchError extends CmsError {}

const secretKey = (token: string) => createHmac("sha256", "WebAppData").update(token).digest();

/** Checks Telegram's signature and age, and returns who opened the app. */
export function validateInitData(initData: string, token: string, now = Date.now()): Launch {
  ensure(token, "Telegram is not configured");
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  params.delete("hash");
  const invalid = new LaunchError("Telegram sign-in could not be verified. Close the app and open it again from the bot.");
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) throw invalid;
  const check = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const expected = createHmac("sha256", secretKey(token)).update(check).digest("hex");
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(hash))) throw invalid;

  const authDate = Number(params.get("auth_date"));
  if (!Number.isFinite(authDate)) throw invalid;
  const age = now / 1000 - authDate;
  if (age > MAX_AGE_SECONDS) throw new LaunchError("This session has expired. Close the app and open it again from the bot.");
  if (age < -SKEW_SECONDS) throw invalid;

  let user: { id?: unknown; first_name?: unknown; last_name?: unknown; username?: unknown };
  try {
    user = JSON.parse(params.get("user") ?? "");
  } catch {
    throw invalid;
  }
  if (typeof user.id !== "number" || !Number.isSafeInteger(user.id)) throw invalid;
  return {
    user: {
      id: user.id,
      name: [user.first_name, user.last_name].filter((x) => typeof x === "string" && x).join(" ") || "Someone",
      username: typeof user.username === "string" ? user.username : "",
    },
    authDate,
    startParam: params.get("start_param") ?? "",
    chatType: params.get("chat_type") ?? "",
  };
}

// ── Membership ───────────────────────────────────────────────────────────

export interface Membership {
  member: boolean;
  /** Telegram's word for the user in that chat: creator, administrator, member, restricted, left, kicked */
  status?: string;
  /** Why Telegram couldn't say (the bot isn't in the chat, can't see its members…) */
  error?: string;
}

/** In the chat: a member or admin, or restricted but still there. */
export const isInChat = (m: ChatMember) => m.status === "creator" || m.status === "administrator" || m.status === "member" || (m.status === "restricted" && m.is_member);

const cache = new Map<string, { at: number; result: Membership }>();
export const clearMembershipCache = () => cache.clear();

/** Asks Telegram whether a user is in a chat. A failure counts as "not a member" and says why. */
export async function membership(api: Api, chatId: number, userId: number, now = Date.now()): Promise<Membership> {
  const key = `${chatId}:${userId}`;
  const hit = cache.get(key);
  if (hit && now - hit.at < CACHE_MS) return hit.result;
  let result: Membership;
  try {
    const m = await api.getChatMember(chatId, userId);
    result = { member: isInChat(m), status: m.status };
  } catch (error) {
    result = { member: false, error: error instanceof Error ? error.message.replace(/bot\d+:[\w-]+/g, "bot<token>") : "Telegram request failed" };
  }
  cache.set(key, { at: now, result });
  return result;
}

// ── Access ───────────────────────────────────────────────────────────────

export interface Access {
  launch: Launch;
  admin: Actor | null;
  /** The project groups this person may open */
  groups: { group: ProjectGroup; how: "admin" | "member" }[];
  /** What Telegram answered for each connected chat (only asked for when `diagnose` is set) */
  checks: { group: number; chatId: number; status?: string; error?: string }[];
}

/** "g3" → 3: the project group a launch link points at. */
const hinted = (startParam: string) => {
  const m = startParam.match(/^g(\d+)$/);
  return m ? Number(m[1]) : undefined;
};

/**
 * What a launch may open. `diagnose` also asks Telegram about every connected chat, so an admin can see
 * whether the bot is able to check membership there (the answer, or the error, is shown to admins only).
 */
export async function resolveAccess(launch: Launch, api: Api, opts: { diagnose?: boolean; now?: number } = {}): Promise<Access> {
  const now = opts.now ?? Date.now();
  const admin = await tracker.adminByTelegramId(launch.user.id);
  const connected = await tracker.connectedGroups();
  const checks: Access["checks"] = [];

  if (opts.diagnose) {
    for (const g of connected) {
      const r = await membership(api, g.telegramChatId!, launch.user.id, now);
      checks.push({ group: g.number, chatId: g.telegramChatId!, ...(r.status ? { status: r.status } : {}), ...(r.error ? { error: r.error } : {}) });
    }
  }

  if (admin) {
    const cohortId = await tracker.trackerCohortId();
    const groups = cohortId ? await tracker.listProjectGroups(admin, cohortId) : [];
    return { launch, admin, groups: groups.map((group) => ({ group, how: "admin" as const })), checks };
  }

  // The linked group first: one question to Telegram in the usual case. Only a member of it gets it.
  const first = connected.find((g) => g.number === hinted(launch.startParam));
  const order = first ? [first, ...connected.filter((g) => g !== first)] : connected;
  const groups: Access["groups"] = [];
  for (const group of order) {
    if ((await membership(api, group.telegramChatId!, launch.user.id, now)).member) {
      groups.push({ group, how: "member" });
      if (first && group === first) break;
    }
  }
  return { launch, admin: null, groups, checks };
}

// ── Requests ─────────────────────────────────────────────────────────────

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

function initDataOf(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("tma ") ? header.slice(4) : "";
}

/** A thrown failure as the response the app shows: 401 for a launch we won't trust, 400 for a CmsError, else 500. */
function failure(error: unknown) {
  if (error instanceof LaunchError) return json({ error: error.message }, 401);
  if (error instanceof CmsError) return json({ error: error.message }, 400);
  console.error("[mini-app]", error);
  return json({ error: "Something went wrong. Try again in a moment." }, 500);
}

/** GET /api/mini-app/session: who this is and which project groups they may open. */
export async function handleSession(request: Request, api: Api, token = telegramToken(), now = Date.now()) {
  try {
    const launch = validateInitData(initDataOf(request), token, now);
    const access = await resolveAccess(launch, api, { diagnose: true, now });
    return json({
      user: { id: launch.user.id, name: launch.user.name },
      admin: Boolean(access.admin),
      chatType: launch.chatType,
      startParam: launch.startParam,
      groups: access.groups.map(({ group, how }) => ({ number: group.number, name: group.name, how })),
      // Only admins see how Telegram answered; a member learns nothing about other chats.
      ...(access.admin ? { checks: access.checks } : {}),
    });
  } catch (error) {
    return failure(error);
  }
}

/** GET /api/mini-app/timeline?group=3: one project group's milestones and tasks, if this person may open it. */
export async function handleTimeline(request: Request, api: Api, token = telegramToken(), now = Date.now()) {
  try {
    const launch = validateInitData(initDataOf(request), token, now);
    const raw = new URL(request.url).searchParams.get("group") ?? "";
    ensure(/^\d+$/.test(raw), "Choose a project group.");
    const number = Number(raw);
    const access = await resolveAccess(launch, api, { now });
    const entry = access.groups.find((g) => g.group.number === number);
    if (!entry) return json({ error: "You are not in that project group's chat." }, 403);
    const who = access.admin ? tracker.adminWho(access.admin) : tracker.memberWho(entry.group.id, launch.user.name);
    const [timeline, members] = await Promise.all([tracker.getTimeline(who, entry.group.id), tracker.listMembers(who, entry.group.id)]);
    return json({
      group: { number: entry.group.number, name: entry.group.name },
      milestones: timeline.map((m) => ({
        number: m.number,
        title: m.title,
        status: m.status,
        startsOn: m.startsOn,
        dueOn: m.dueOn,
        openBlockers: m.blockers.filter((b) => b.status === "open").length,
        tasks: m.subtasks.map((s) => ({
          number: s.number,
          title: s.title,
          status: s.status,
          dueOn: s.dueOn,
          assignee: members.find((x) => x.id === s.assigneeId)?.name ?? s.assigneeName,
        })),
      })),
    });
  } catch (error) {
    return failure(error);
  }
}
