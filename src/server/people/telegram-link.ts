import { createHash, randomBytes } from "node:crypto";
import { and, eq, lt } from "drizzle-orm";
import { getDb } from "@/server/db";
import { people, projectGroups, telegramLinkCodes, type TelegramLinkKind } from "@/server/db/schema";
import { CmsError, ensure, type Actor } from "../core/actor";
import { can } from "../core/permissions";
import { findAccess } from "./people";
import { getBotUsername } from "../integrations/telegram/client";
import { connectChat, type ProjectGroup } from "../dap/tracker/service";

/*
 * One-time Telegram links made in the CMS.
 *
 * - Account: t.me/<bot>?start=<code>. Opened in a private chat with the bot, it links that
 *   Telegram account to the CMS account that made the link, so the bot knows them as DAP exco.
 * - Chat: t.me/<bot>?startgroup=<code>. Telegram asks which group to add the bot to, then sends
 *   /start <code> there, which connects that chat to the project group the link was made for.
 *
 * A code is random, stored only as a SHA-256 hash, works once and expires after 10 minutes.
 * Making a new link replaces the previous unused one. No secret from the environment is involved.
 */

const TTL_MS = 10 * 60_000;
const hash = (code: string) => createHash("sha256").update(code).digest("hex");
/** 32 characters of [A-Za-z0-9_-]: what Telegram allows in a start parameter (at most 64). */
const newCode = () => randomBytes(24).toString("base64url");

const INVALID = "This link is invalid, expired or already used. Make a new one in the CMS.";

async function createCode(actor: Actor, kind: TelegramLinkKind, target: { email?: string; projectGroupId?: number }, now: number) {
  const db = await getDb();
  const code = newCode();
  // One live link per account or project group: a new one replaces the last.
  if (target.email) await db.delete(telegramLinkCodes).where(and(eq(telegramLinkCodes.kind, kind), eq(telegramLinkCodes.email, target.email)));
  if (target.projectGroupId) {
    await db.delete(telegramLinkCodes).where(and(eq(telegramLinkCodes.kind, kind), eq(telegramLinkCodes.projectGroupId, target.projectGroupId)));
  }
  await db.insert(telegramLinkCodes).values({
    codeHash: hash(code),
    kind,
    email: target.email ?? null,
    projectGroupId: target.projectGroupId ?? null,
    createdBy: actor.email,
    expiresAt: new Date(now + TTL_MS).toISOString(),
  });
  return code;
}

async function botName() {
  const name = await getBotUsername();
  ensure(name, "The Telegram bot is not configured: TELEGRAM_BOT_TOKEN is not set");
  return name;
}

/** The signed-in admin links their own Telegram account; nobody can make a link for someone else. */
export async function createAccountLink(actor: Actor, now = Date.now()) {
  ensure(can.tracker(actor), "This role cannot use the timeline tracker");
  const bot = await botName();
  return `https://t.me/${bot}?start=${await createCode(actor, "account", { email: actor.email.toLowerCase() }, now)}`;
}

/** A link that adds the bot to a group chat and connects that chat to this project group. */
export async function createChatLink(actor: Actor, projectGroupId: number, now = Date.now()) {
  ensure(can.tracker(actor), "This role cannot use the timeline tracker");
  const db = await getDb();
  const [group] = await db.select({ id: projectGroups.id }).from(projectGroups).where(eq(projectGroups.id, projectGroupId));
  ensure(group, "Project group not found");
  const bot = await botName();
  return `https://t.me/${bot}?startgroup=${await createCode(actor, "chat", { projectGroupId }, now)}`;
}

/**
 * Uses up a code of the given kind. A code sent where it doesn't belong gives a message saying
 * where to open it; an account link posted in a group is also deleted, since the group saw it.
 */
async function takeCode(code: string, kind: TelegramLinkKind, now: number) {
  const db = await getDb();
  const [row] = await db.select().from(telegramLinkCodes).where(eq(telegramLinkCodes.codeHash, hash(code)));
  if (!row || Date.parse(row.expiresAt) < now) throw new CmsError(INVALID);
  if (row.kind !== kind) {
    if (row.kind === "account") {
      await db.delete(telegramLinkCodes).where(eq(telegramLinkCodes.id, row.id));
      throw new CmsError("That link is for a private chat with me, and it was posted here, so it no longer works. Make a new one in Settings › Telegram.");
    }
    throw new CmsError("That link connects a group chat. Open it and pick the project group's chat.");
  }
  // Deleting is the claim: of two people racing with the same code, only one gets the row back.
  const [claimed] = await db.delete(telegramLinkCodes).where(eq(telegramLinkCodes.id, row.id)).returning();
  if (!claimed) throw new CmsError(INVALID);
  return claimed;
}

export interface TelegramAccount {
  id: number;
  /** First and last name as Telegram shows them */
  name: string;
  /** Without the @; empty when the account has none */
  username: string;
}

/** /start <code> in a private chat: links the sender's Telegram account to the CMS account that made the code. */
export async function claimAccountLink(code: string, account: TelegramAccount, now = Date.now()): Promise<Actor> {
  const row = await takeCode(code, "account", now);
  const email = row.email!;
  const actor = await findAccess(email);
  if (!actor || !can.tracker(actor)) throw new CmsError("This account does not have DAP exco access.");

  const db = await getDb();
  const [taken] = await db.select({ email: people.email }).from(people).where(eq(people.telegramUserId, account.id));
  if (taken && taken.email !== email) throw new CmsError("This Telegram account is already linked to another CMS account.");

  const linked = { telegramUserId: account.id, telegramName: account.name, telegramUsername: account.username };
  const [row2] = await db.update(people).set(linked).where(eq(people.email, email)).returning({ email: people.email });
  // A bootstrap superadmin may not have a People row yet.
  if (!row2) await db.insert(people).values({ email, name: actor.name, role: "exco", ...linked });
  return actor;
}

/** /start <code> in a group chat: connects that chat to the code's project group. */
export async function claimChatLink(code: string, chatId: number, now = Date.now()): Promise<ProjectGroup> {
  ensure(Number.isSafeInteger(chatId) && chatId < 0, "That link connects a group chat. Open it and pick the project group's chat.");
  const row = await takeCode(code, "chat", now);
  return connectChat(row.projectGroupId!, chatId);
}

/** Daily cleanup of codes nobody used. Returns how many were deleted. */
export async function forgetExpiredCodes(now = new Date()) {
  const db = await getDb();
  const rows = await db.delete(telegramLinkCodes).where(lt(telegramLinkCodes.expiresAt, now.toISOString())).returning({ id: telegramLinkCodes.id });
  return rows.length;
}

/** Clears a Telegram link: anyone may unlink their own; exco admins may unlink anyone's. */
export async function unlinkTelegram(actor: Actor, email = actor.email) {
  ensure(email.toLowerCase() === actor.email.toLowerCase() || can.manageTelegramBot(actor), "Only an exco admin can unlink someone else");
  const db = await getDb();
  await db.update(people).set({ telegramUserId: null, telegramName: "", telegramUsername: "" }).where(eq(people.email, email.toLowerCase()));
}

/** The Telegram account linked to a CMS account, or null. */
export async function linkedTelegram(email: string): Promise<TelegramAccount | null> {
  const db = await getDb();
  const [row] = await db
    .select({ id: people.telegramUserId, name: people.telegramName, username: people.telegramUsername })
    .from(people)
    .where(eq(people.email, email.toLowerCase()));
  return row?.id ? { id: row.id, name: row.name, username: row.username } : null;
}
