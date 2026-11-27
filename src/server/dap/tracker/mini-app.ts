import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Api } from "grammy";
import type { ChatMember } from "grammy/types";
import { CmsError, ensure, type Actor } from "@/server/core/actor";
import { noonSgt, sgtDay } from "@/shared/time";
import { telegramToken } from "@/server/integrations/telegram/client";
import * as tracker from "./service";
import type { ProjectGroup, TrackerWho } from "./service";

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
class LaunchError extends CmsError {}

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
const isInChat = (m: ChatMember) => m.status === "creator" || m.status === "administrator" || m.status === "member" || (m.status === "restricted" && m.is_member);

const cache = new Map<string, { at: number; result: Membership }>();
export const clearMembershipCache = () => cache.clear();

/** Asks Telegram whether a user is in a chat. A failure counts as "not a member" and says why. */
async function membership(api: Api, chatId: number, userId: number, now = Date.now()): Promise<Membership> {
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
 * What a launch may open. `only` asks about that one project group (a timeline request needs nothing else).
 * `diagnose` also asks Telegram about every connected chat, so an admin can see whether the bot is able to
 * check membership there; members never trigger it, since they are never shown the answers.
 */
export async function resolveAccess(launch: Launch, api: Api, opts: { diagnose?: boolean; only?: number; now?: number } = {}): Promise<Access> {
  const now = opts.now ?? Date.now();
  const admin = await tracker.adminByTelegramId(launch.user.id);
  const connected = await tracker.connectedGroups();
  const checks: Access["checks"] = [];

  if (admin) {
    if (opts.diagnose) {
      for (const g of connected) {
        const r = await membership(api, g.telegramChatId!, launch.user.id, now);
        checks.push({ group: g.number, chatId: g.telegramChatId!, ...(r.status ? { status: r.status } : {}), ...(r.error ? { error: r.error } : {}) });
      }
    }
    const cohortId = await tracker.trackerCohortId();
    const groups = cohortId ? await tracker.listProjectGroups(admin, cohortId) : [];
    return { launch, admin, groups: groups.map((group) => ({ group, how: "admin" as const })), checks };
  }

  // One project group asked for: one question to Telegram, about that group's chat only.
  if (opts.only !== undefined) {
    const group = connected.find((g) => g.number === opts.only);
    const member = group && (await membership(api, group.telegramChatId!, launch.user.id, now)).member;
    return { launch, admin: null, groups: member ? [{ group, how: "member" }] : [], checks };
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

/** One project group's timeline as the app shows it. `manage` is what only a DAP exco may do (milestones, reminders). */
async function timelinePayload(who: TrackerWho, group: ProjectGroup, manage: boolean) {
  const [timeline, members, row] = await Promise.all([tracker.getTimeline(who, group.id), tracker.listMembers(who, group.id), tracker.projectGroup(who, group.id)]);
  return {
    group: { number: row.number, name: row.name },
    can: { manage },
    meeting: { lastOn: row.lastMeetingAt ? sgtDay(row.lastMeetingAt) : null, dueBy: sgtDay(tracker.meetingDeadline(row)), reminders: row.meetingRemindersOn },
    members: members.map((m) => ({ id: m.id, name: m.name })),
    milestones: timeline.map((m) => ({
      number: m.number,
      title: m.title,
      notes: m.notes,
      status: m.status,
      startsOn: m.startsOn,
      dueOn: m.dueOn,
      blockers: m.blockers.map((b) => ({ number: b.number, description: b.description, status: b.status })),
      tasks: m.subtasks.map((s) => ({
        number: s.number,
        title: s.title,
        status: s.status,
        dueOn: s.dueOn,
        assigneeId: s.assigneeId,
        assignee: members.find((x) => x.id === s.assigneeId)?.name ?? s.assigneeName,
      })),
    })),
  };
}

/** The project group a request is about, if this person may open it. */
async function opened(request: Request, api: Api, token: string, now: number, raw: unknown) {
  const launch = validateInitData(initDataOf(request), token, now);
  ensure(/^\d+$/.test(String(raw ?? "")), "Choose a project group.");
  const number = Number(raw);
  const access = await resolveAccess(launch, api, { only: number, now });
  const entry = access.groups.find((g) => g.group.number === number);
  if (!entry) return null;
  const who = access.admin ? tracker.adminWho(access.admin) : tracker.memberWho(entry.group.id, launch.user.name);
  return { who, actor: access.admin, group: entry.group };
}

const NOT_IN_CHAT = "You are not in that project group's chat.";

/** GET /api/mini-app/timeline?group=3: one project group's milestones and tasks, if this person may open it. */
export async function handleTimeline(request: Request, api: Api, token = telegramToken(), now = Date.now()) {
  try {
    const open = await opened(request, api, token, now, new URL(request.url).searchParams.get("group"));
    if (!open) return json({ error: NOT_IN_CHAT }, 403);
    return json(await timelinePayload(open.who, open.group, Boolean(open.actor)));
  } catch (error) {
    return failure(error);
  }
}

// ── Changes ──────────────────────────────────────────────────────────────

type Body = Record<string, unknown>;
interface Step {
  who: TrackerWho;
  actor: Actor | null;
  group: ProjectGroup;
}

const text = (b: Body, key: string) => (typeof b[key] === "string" ? (b[key] as string) : undefined);
/** A field the caller may leave out (undefined), clear ("" or null → null) or set. */
function maybe(b: Body, key: string): string | null | undefined {
  if (!(key in b)) return undefined;
  const v = b[key];
  ensure(v === null || typeof v === "string", `${key} must be text`);
  return v === "" ? null : (v as string | null);
}
const number = (b: Body, key: string, label: string) => {
  ensure(typeof b[key] === "number" && Number.isSafeInteger(b[key]), `${label} is required`);
  return b[key] as number;
};
const admin = (s: Step) => {
  ensure(s.actor, "Only DAP exco can do that.");
  return s.actor;
};
const tag = (kind: tracker.ItemKind, n: number) => `${tracker.LABEL[kind]}${n}`;

/** What the app may change: the same service calls the bot makes, so the same rules (scope, due dates, numbering) apply. */
const ACTIONS: Record<string, (s: Step, b: Body) => Promise<string>> = {
  "milestone.save": async (s, b) => {
    const actor = admin(s);
    const n = typeof b.number === "number" ? b.number : undefined;
    const id = n === undefined ? undefined : await tracker.idByNumber(s.who, s.group.id, "milestone", n);
    const row = await tracker.saveMilestone(actor, {
      id,
      groupId: s.group.id,
      title: text(b, "title") ?? "",
      notes: text(b, "notes"),
      startsOn: maybe(b, "startsOn"),
      dueOn: text(b, "dueOn") ?? "",
      status: text(b, "status") as never,
    });
    return `Milestone ${tag("milestone", row.number)} ${id ? "saved" : "added"}`;
  },
  "milestone.delete": async (s, b) => {
    const actor = admin(s);
    const n = number(b, "number", "Milestone");
    await tracker.deleteMilestone(actor, await tracker.idByNumber(s.who, s.group.id, "milestone", n));
    return `Milestone ${tag("milestone", n)} deleted`;
  },
  "task.save": async (s, b) => {
    const patch = {
      ...(text(b, "title") !== undefined ? { title: text(b, "title") } : {}),
      ...(text(b, "status") !== undefined ? { status: text(b, "status") as never } : {}),
      ...("dueOn" in b ? { dueOn: maybe(b, "dueOn") } : {}),
      ...("assigneeId" in b ? { assigneeId: b.assigneeId === null ? null : number(b, "assigneeId", "Assignee") } : {}),
      ...(text(b, "assigneeName") !== undefined ? { assigneeName: text(b, "assigneeName") } : {}),
    };
    if (typeof b.number === "number") {
      const row = await tracker.updateSubtask(s.who, await tracker.idByNumber(s.who, s.group.id, "task", b.number), patch);
      return `Task ${tag("task", row.number)} saved`;
    }
    const milestoneId = await tracker.idByNumber(s.who, s.group.id, "milestone", number(b, "milestone", "Milestone"));
    const row = await tracker.addSubtask(s.who, { milestoneId, title: patch.title ?? "", ...patch });
    return `Task ${tag("task", row.number)} added`;
  },
  "task.delete": async (s, b) => {
    const n = number(b, "number", "Task");
    await tracker.deleteSubtask(s.who, await tracker.idByNumber(s.who, s.group.id, "task", n));
    return `Task ${tag("task", n)} deleted`;
  },
  "blocker.save": async (s, b) => {
    if (typeof b.number === "number") {
      const row = await tracker.updateBlocker(s.who, await tracker.idByNumber(s.who, s.group.id, "blocker", b.number), { description: text(b, "description"), status: text(b, "status") as never });
      return `Blocker ${tag("blocker", row.number)} saved`;
    }
    const milestoneId = await tracker.idByNumber(s.who, s.group.id, "milestone", number(b, "milestone", "Milestone"));
    const row = await tracker.addBlocker(s.who, { milestoneId, description: text(b, "description") ?? "" });
    return `Blocker ${tag("blocker", row.number)} added`;
  },
  "blocker.delete": async (s, b) => {
    const n = number(b, "number", "Blocker");
    await tracker.deleteBlocker(s.who, await tracker.idByNumber(s.who, s.group.id, "blocker", n));
    return `Blocker ${tag("blocker", n)} deleted`;
  },
  "meeting.log": async (s, b) => {
    const day = maybe(b, "date");
    ensure(!day || tracker.isIsoDate(day), "Meeting date must be a real date");
    await tracker.logMeeting(s.who, s.group.id, day && day !== sgtDay(new Date()) ? noonSgt(day) : new Date());
    return "Meeting logged";
  },
  "reminders.set": async (s, b) => {
    ensure(typeof b.on === "boolean", "Choose on or off");
    await tracker.setMeetingReminders(admin(s), s.group.id, b.on);
    return `Reminders ${b.on ? "on" : "off"}`;
  },
};

/** POST /api/mini-app/action: { group, action, …fields }. Returns what happened and the project group's fresh timeline. */
export async function handleAction(request: Request, api: Api, token = telegramToken(), now = Date.now()) {
  try {
    const body: Body = await request.json().catch(() => ({}));
    ensure(body && typeof body === "object" && !Array.isArray(body), "The request was not understood.");
    const open = await opened(request, api, token, now, body.group);
    if (!open) return json({ error: NOT_IN_CHAT }, 403);
    const run = typeof body.action === "string" && Object.hasOwn(ACTIONS, body.action) ? ACTIONS[body.action] : undefined;
    ensure(run, "That change is not available.");
    const message = await run(open, body);
    return json({ message, timeline: await timelinePayload(open.who, open.group, Boolean(open.actor)) });
  } catch (error) {
    return failure(error);
  }
}
