import { sql } from "drizzle-orm";
import { getDb } from "@/app/lib/db";
import { siteSettings } from "@/app/lib/db/schema";
import { CmsError, ensure, type Actor } from "./actor";
import {
  formatGroups,
  formatMeetingReminder,
  formatMilestone,
  formatTimeline,
  noonSgt,
  parseCommand,
  parseDate,
  parseStatus,
  shortDate,
  sgtDay,
  splitTitleAndDates,
} from "./bot-text";
import { todaySgt } from "./people";
import { botUsername, callTelegram, escapeHtml as esc, type TelegramCall } from "./telegram";
import { claimAdminLink } from "./telegram-link";
import * as tracker from "./tracker";
import type { ProjectGroup, TrackerWho } from "./tracker";

/*
 * The DAP tracker bot. Telegram posts updates to /api/telegram/webhook, which
 * calls handleUpdate. The bot only listens in a registered group chat (or in a
 * private chat with a linked admin). Permissions are decided by tracker.ts; this
 * file only reads commands and writes replies.
 *
 * Inside a group chat everything is scoped to that chat's group, admins
 * included, so one group's data never reaches another group's chat. Admins
 * reach other groups, and /groups, from a private chat with the bot.
 */

interface TgUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
}
interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: { id: number; type: string };
  text?: string;
  migrate_to_chat_id?: number;
  migrate_from_chat_id?: number;
}
export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: { id: string; from: TgUser; message?: TgMessage; data?: string };
}

// ── Update de-duplication ────────────────────────────────────────────────

/**
 * Telegram re-sends an update it thinks failed. The last handled update_id lives in
 * site_settings and is advanced atomically, so a repeat (or a concurrent retry) loses.
 * This assumes in-order delivery, which the webhook gets with max_connections=1
 * (see docs/tracker-setup.md).
 */
export async function claimUpdate(updateId: number) {
  const db = await getDb();
  const rows = await db
    .insert(siteSettings)
    .values({ key: "telegram_last_update", value: { id: updateId } })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: { id: updateId }, updatedAt: new Date().toISOString() },
      setWhere: sql`(${siteSettings.value}->>'id')::bigint < ${updateId}::bigint`,
    })
    .returning({ key: siteSettings.key });
  return rows.length > 0;
}

// ── Context ──────────────────────────────────────────────────────────────

interface Ctx {
  chatId: number;
  isPrivate: boolean;
  name: string;
  who: TrackerWho;
  actor: Actor | null;
  group: ProjectGroup | null;
  /** What data commands run as: in a group chat, always that chat's group (never wider, even for admins) */
  scope: TrackerWho;
  today: string;
}

interface Reply {
  text: string;
  markup?: { inline_keyboard: { text: string; callback_data: string }[][] };
}

const HELP_MEMBER = [
  "<b>Tracker commands</b>",
  "/milestones — timeline and progress",
  "/task &lt;milestone#&gt; title [by 20 Nov] — add a task",
  "/edittask &lt;task#&gt; new title [by 20 Nov]",
  "/taskstatus &lt;task#&gt; todo|doing|done  ·  /taskdone &lt;task#&gt;",
  "/assign &lt;task#&gt; name|none",
  "/deltask &lt;task#&gt;",
  "/blocker &lt;milestone#&gt; text — log a blocker",
  "/editblocker &lt;blocker#&gt; text  ·  /resolve &lt;blocker#&gt;  ·  /reopenblocker &lt;blocker#&gt;",
  "/delblocker &lt;blocker#&gt;",
  "/meeting [date] — log a meeting with your mentors",
];
const HELP_ADMIN = [
  "",
  "<b>DAP exco</b>",
  "/register &lt;group#&gt; — link this chat to a group",
  "/milestone [g3] title [from 1 Dec] by 15 Dec",
  "/editmilestone &lt;milestone#&gt; title [from …] [by …]",
  "/done &lt;milestone#&gt;  ·  /status &lt;milestone#&gt; todo|doing|done",
  "/delmilestone &lt;milestone#&gt;",
  "/reminders [g3] on|off — meeting reminders",
  "In a private chat with the bot: /groups, and add g3 to reach another group.",
];

// ── Entry point ──────────────────────────────────────────────────────────

export async function handleUpdate(update: TgUpdate, tg: TelegramCall = callTelegram) {
  try {
    if (update.message) await onMessage(update.message, tg);
    else if (update.callback_query) await onCallback(update.callback_query, tg);
  } catch (error) {
    console.error("[bot] unhandled", error);
  }
}

const displayName = (u: TgUser) => [u.first_name, u.last_name].filter(Boolean).join(" ") || "Someone";

async function contextFor(chat: { id: number; type: string }, from: TgUser): Promise<Ctx | null> {
  const sender = await tracker.resolveSender(chat.id, from.id, displayName(from));
  if (!sender) return null;
  const isPrivate = chat.type === "private";
  // Group chats other than a registered one are ignored; so are non-members.
  if (!isPrivate && !sender.group) return null;
  return {
    chatId: chat.id,
    isPrivate,
    name: sender.who.name,
    who: sender.who,
    actor: sender.actor,
    group: sender.group,
    scope: isPrivate ? sender.who : tracker.memberWho(sender.group!.id, sender.who.name),
    today: todaySgt(),
  };
}

async function onMessage(m: TgMessage, tg: TelegramCall) {
  if (m.migrate_to_chat_id) return tracker.migrateChat(m.chat.id, m.migrate_to_chat_id);
  if (m.migrate_from_chat_id) return tracker.migrateChat(m.migrate_from_chat_id, m.chat.id);
  if (!m.from || m.from.is_bot || !m.text) return;
  const cmd = parseCommand(m.text, botUsername());
  if (!cmd || cmd.forOtherBot) return;

  const isPrivate = m.chat.type === "private";
  const say = (r: Reply | string) => {
    const reply = typeof r === "string" ? { text: r } : r;
    return tg("sendMessage", {
      chat_id: m.chat.id,
      text: reply.text,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      reply_parameters: { message_id: m.message_id, allow_sending_without_reply: true },
      ...(reply.markup ? { reply_markup: reply.markup } : {}),
    });
  };

  try {
    if (cmd.cmd === "start" && isPrivate && cmd.args) {
      const actor = await claimAdminLink(cmd.args, m.from.id);
      return say(`Linked. You are now a DAP tracker admin as <b>${esc(actor.name)}</b>. Add me to a group chat and send /register &lt;group#&gt;.`);
    }
    if (cmd.cmd === "start" && !isPrivate && cmd.args) {
      return say("Open the link in a private chat with me instead, and generate a new one in Settings › Telegram.");
    }

    const c = await contextFor(m.chat, m.from);
    if (!c) {
      // A private chat gets an answer; group chats stay silent unless an admin is registering one.
      if (isPrivate) return say("You are not registered. DAP exco: generate a link in the website's Settings › Telegram.");
      const sender = await tracker.resolveSender(m.chat.id, m.from.id, displayName(m.from));
      if (cmd.cmd === "register" && sender?.actor) return say(await register(adminOnly(sender.actor, m.chat.id, displayName(m.from)), cmd.args));
      return;
    }
    return say(await dispatch(c, cmd.cmd, cmd.args));
  } catch (error) {
    if (error instanceof CmsError) return say(`⚠️ ${esc(error.message)}`);
    console.error("[bot] command failed", cmd.cmd, error);
    return say("Something went wrong. Try again in a moment.");
  }
}

/** /register is the one command an admin may send from a chat that is not registered yet. */
const adminOnly = (actor: Actor, chatId: number, name: string): Ctx => ({
  chatId,
  isPrivate: false,
  name,
  who: tracker.adminWho(actor),
  actor,
  group: null,
  scope: tracker.adminWho(actor),
  today: todaySgt(),
});

// ── Commands ─────────────────────────────────────────────────────────────

const requireActor = (c: Ctx): Actor => {
  ensure(c.actor, "Only DAP exco can do that.");
  return c.actor;
};

function idArg(args: string, usage: string): [number, string] {
  const m = args.match(/^#?(\d+)\s*([\s\S]*)$/);
  ensure(m, `Usage: ${usage}`);
  return [Number(m[1]), m[2].trim()];
}

/** The group a command is about: this chat's, or an admin's explicit one from a private chat. */
async function groupFor(c: Ctx, explicit?: number): Promise<ProjectGroup> {
  if (explicit !== undefined && c.actor) {
    ensure(c.isPrivate || explicit === c.group?.number, `This chat is Group ${c.group?.number}. Message me privately to work on another group.`);
    return c.group?.number === explicit ? c.group : tracker.groupByNumber(c.actor, explicit);
  }
  ensure(c.group, "Which group? Add its number, e.g. /milestones g3");
  return c.group;
}

/** An optional leading "g3" or "3" naming a group. */
function leadingGroup(args: string, needG: boolean): [number | undefined, string] {
  const m = args.match(needG ? /^g(\d+)\b\s*([\s\S]*)$/i : /^g?(\d+)\b\s*([\s\S]*)$/i);
  return m ? [Number(m[1]), m[2].trim()] : [undefined, args];
}

async function dispatch(c: Ctx, cmd: string, args: string): Promise<Reply | string> {
  switch (cmd) {
    case "start":
    case "help":
      return [...HELP_MEMBER, ...(c.actor ? HELP_ADMIN : [])].join("\n");

    case "register": {
      return register(c, args);
    }

    case "groups": {
      const actor = requireActor(c);
      ensure(c.isPrivate, "Use /groups in a private chat with me.");
      const cohortId = await tracker.trackerCohortId();
      return formatGroups(cohortId ? await tracker.listProjectGroups(actor, cohortId) : [], c.today);
    }

    case "milestones": {
      const [n] = leadingGroup(args, false);
      const group = await groupFor(c, n);
      const list = await tracker.getTimeline(c.scope, group.id);
      const buttons = list.slice(0, 12).map((m) => ({ text: `#${m.id}`, callback_data: `m:${m.id}` }));
      const rows = [];
      for (let i = 0; i < buttons.length; i += 4) rows.push(buttons.slice(i, i + 4));
      return { text: formatTimeline(group, list, c.today), ...(rows.length ? { markup: { inline_keyboard: rows } } : {}) };
    }

    case "milestone": {
      const actor = requireActor(c);
      const [n, rest] = leadingGroup(args, true);
      const group = await groupFor(c, n);
      const p = splitTitleAndDates(rest, c.today);
      ensure(p.title, "Usage: /milestone [g3] title [from 1 Dec] by 15 Dec");
      ensure(!p.badDue, `Couldn't read the date "${p.badDue}". Try 15 Dec or 2026-12-15.`);
      ensure(p.dueOn, "A milestone needs a due date: /milestone title by 15 Dec");
      const m = await tracker.saveMilestone(actor, { groupId: group.id, title: p.title, startsOn: p.startsOn, dueOn: p.dueOn });
      return `Added milestone <b>#${m.id}</b> ${esc(m.title)}, due ${shortDate(m.dueOn, c.today)} (Group ${group.number}).`;
    }

    case "editmilestone": {
      const actor = requireActor(c);
      const [id, rest] = idArg(args, "/editmilestone <milestone#> title [from …] [by …]");
      const cur = await tracker.getMilestone(c.scope, id);
      const p = splitTitleAndDates(rest, c.today);
      ensure(!p.badDue, `Couldn't read the date "${p.badDue}". Try 15 Dec or 2026-12-15.`);
      ensure(p.title || p.dueOn, "Give a new title, a new due date (by 15 Dec), or both.");
      const m = await tracker.saveMilestone(actor, {
        id,
        groupId: cur.groupId,
        title: p.title || cur.title,
        dueOn: p.dueOn ?? cur.dueOn,
        ...(p.startsOn ? { startsOn: p.startsOn } : {}),
      });
      return `Updated <b>#${m.id}</b> ${esc(m.title)}, due ${shortDate(m.dueOn, c.today)}.`;
    }

    case "done":
    case "status": {
      const actor = requireActor(c);
      const [id, rest] = idArg(args, cmd === "done" ? "/done <milestone#>" : "/status <milestone#> todo|doing|done");
      const status = cmd === "done" ? "done" : parseStatus(rest);
      ensure(status, "Status must be todo, doing or done.");
      await tracker.getMilestone(c.scope, id);
      const m = await tracker.setMilestoneStatus(actor, id, status);
      return `${m.status === "done" ? "✅" : "⏳"} <b>#${m.id}</b> ${esc(m.title)} is now ${m.status.replace("_", " ")}.`;
    }

    case "delmilestone": {
      requireActor(c);
      const [id] = idArg(args, "/delmilestone <milestone#>");
      await tracker.getMilestone(c.scope, id);
      return confirm(`Delete milestone #${id} with all its tasks and blockers?`, `m:${id}`);
    }

    case "task": {
      const [id, rest] = idArg(args, "/task <milestone#> title [by 20 Nov]");
      const p = splitTitleAndDates(rest, c.today);
      ensure(p.title, "Usage: /task <milestone#> title [by 20 Nov]");
      const s = await tracker.addSubtask(c.scope, { milestoneId: id, title: p.title, dueOn: p.dueOn });
      return `Added task <b>#${s.id}</b> to #${id}: ${esc(s.title)}${s.dueOn ? `, due ${shortDate(s.dueOn, c.today)}` : ""}.`;
    }

    case "edittask": {
      const [id, rest] = idArg(args, "/edittask <task#> new title [by 20 Nov]");
      const p = splitTitleAndDates(rest, c.today);
      ensure(p.title || p.dueOn, "Give a new title, a new due date (by 20 Nov), or both.");
      const s = await tracker.updateSubtask(c.scope, id, { ...(p.title ? { title: p.title } : {}), ...(p.dueOn ? { dueOn: p.dueOn } : {}) });
      return `Updated task <b>#${s.id}</b>: ${esc(s.title)}.`;
    }

    case "taskdone":
    case "taskstatus": {
      const [id, rest] = idArg(args, cmd === "taskdone" ? "/taskdone <task#>" : "/taskstatus <task#> todo|doing|done");
      const status = cmd === "taskdone" ? "done" : parseStatus(rest);
      ensure(status, "Status must be todo, doing or done.");
      const s = await tracker.updateSubtask(c.scope, id, { status });
      return `${status === "done" ? "✅" : status === "in_progress" ? "⏳" : "⬜"} Task <b>#${s.id}</b> ${esc(s.title)} is now ${status.replace("_", " ")}.`;
    }

    case "assign": {
      const [id, rest] = idArg(args, "/assign <task#> name|none");
      ensure(rest, "Usage: /assign <task#> name|none");
      const s = await tracker.assignSubtask(c.scope, id, /^(none|nobody|clear)$/i.test(rest) ? null : rest);
      return s.assigneeId ? `Task <b>#${s.id}</b> assigned.` : `Task <b>#${s.id}</b> is unassigned.`;
    }

    case "deltask": {
      const [id] = idArg(args, "/deltask <task#>");
      return confirm(`Delete task #${id}?`, `t:${id}`);
    }

    case "blocker": {
      const [id, rest] = idArg(args, "/blocker <milestone#> what is blocking you");
      ensure(rest, "Usage: /blocker <milestone#> what is blocking you");
      const b = await tracker.addBlocker(c.scope, { milestoneId: id, description: rest });
      return `🚧 Logged blocker <b>#${b.id}</b> on #${id}. Close it with /resolve ${b.id}.`;
    }

    case "editblocker": {
      const [id, rest] = idArg(args, "/editblocker <blocker#> text");
      ensure(rest, "Usage: /editblocker <blocker#> text");
      const b = await tracker.updateBlocker(c.scope, id, { description: rest });
      return `Updated blocker <b>#${b.id}</b>.`;
    }

    case "resolve":
    case "reopenblocker": {
      const [id] = idArg(args, `/${cmd} <blocker#>`);
      const b = await tracker.updateBlocker(c.scope, id, { status: cmd === "resolve" ? "resolved" : "open" });
      return b.status === "resolved" ? `✔️ Blocker <b>#${b.id}</b> resolved.` : `🚧 Blocker <b>#${b.id}</b> reopened.`;
    }

    case "delblocker": {
      const [id] = idArg(args, "/delblocker <blocker#>");
      return confirm(`Delete blocker #${id}?`, `b:${id}`);
    }

    case "meeting": {
      const [n, rest] = leadingGroup(args, true);
      const group = await groupFor(c, n);
      let at = new Date();
      if (rest) {
        const day = parseDate(rest, c.today, true);
        ensure(day, `Couldn't read the date "${rest}". Try 12 Nov, 2026-11-12 or yesterday.`);
        if (day !== c.today) at = noonSgt(day);
      }
      const g = await tracker.logMeeting(c.scope, group.id, at);
      return `Logged: Group ${g.number} met its mentors on ${shortDate(sgtDay(g.lastMeetingAt!), c.today)}. Next meeting by ${shortDate(sgtDay(tracker.meetingDeadline(g)), c.today)}.`;
    }

    case "reminders": {
      const actor = requireActor(c);
      const m = args.match(/^(?:g?(\d+)\s+)?(on|off)$/i);
      ensure(m, "Usage: /reminders [3] on|off");
      const group = await groupFor(c, m[1] ? Number(m[1]) : undefined);
      const g = await tracker.setMeetingReminders(actor, group.id, m[2].toLowerCase() === "on");
      return `Meeting reminders for Group ${g.number} are ${g.meetingRemindersOn ? "on" : "off"}.`;
    }

    default:
      return "Unknown command. Send /help for the list.";
  }
}

async function register(c: Ctx, args: string): Promise<string> {
  const actor = requireActor(c);
  const m = args.match(/^g?(\d+)$/i);
  ensure(m, "Usage: /register <group#>, sent in the group's chat.");
  const g = await tracker.registerChat(actor, c.chatId, Number(m[1]));
  return `Registered: this chat is <b>Group ${g.number}</b>${g.name ? ` · ${esc(g.name)}` : ""}. Everyone here can log tasks, blockers and meetings. Send /help for commands.`;
}

const confirm = (text: string, target: string): Reply => ({
  text,
  markup: { inline_keyboard: [[{ text: "Delete", callback_data: `y:${target}` }, { text: "Cancel", callback_data: "n" }]] },
});

// ── Buttons ──────────────────────────────────────────────────────────────

async function onCallback(q: NonNullable<TgUpdate["callback_query"]>, tg: TelegramCall) {
  const msg = q.message;
  const answer = (text?: string) => tg("answerCallbackQuery", { callback_query_id: q.id, ...(text ? { text } : {}) });
  if (!msg || !q.data) return answer();

  // Buttons are authorised by whoever pressed them, not by who the message was meant for.
  const c = await contextFor(msg.chat, q.from);
  if (!c) return answer("Not allowed");

  const edit = (text: string) => tg("editMessageText", { chat_id: msg.chat.id, message_id: msg.message_id, text, parse_mode: "HTML" });
  try {
    if (q.data === "n") await edit("Cancelled.");
    else if (q.data.startsWith("m:")) {
      const m = await tracker.getMilestone(c.scope, Number(q.data.slice(2)));
      const members = await tracker.listMembers(c.scope, m.groupId);
      await tg("sendMessage", { chat_id: msg.chat.id, text: formatMilestone(m, members, c.today), parse_mode: "HTML" });
    } else if (q.data.startsWith("y:")) {
      const [, kind, raw] = q.data.split(":");
      const id = Number(raw);
      if (kind === "m") {
        const actor = requireActor(c);
        await tracker.getMilestone(c.scope, id); // never reaches past this chat's group
        await tracker.deleteMilestone(actor, id);
      }
      else if (kind === "t") await tracker.deleteSubtask(c.scope, id);
      else if (kind === "b") await tracker.deleteBlocker(c.scope, id);
      await edit(`Deleted ${{ m: "milestone", t: "task", b: "blocker" }[kind] ?? "item"} #${id}.`);
    }
    return answer();
  } catch (error) {
    if (error instanceof CmsError) return answer(error.message.slice(0, 190));
    console.error("[bot] callback failed", q.data, error);
    return answer("Something went wrong");
  }
}

// ── Meeting reminders (called by the daily cron) ─────────────────────────

/** Sends the 3-week reminder to each due group's chat; a failed send is released so tomorrow's run retries. */
export async function sendMeetingReminders(tg: TelegramCall = callTelegram, now = new Date()) {
  let sent = 0;
  const today = sgtDay(now);
  for (const group of await tracker.dueMeetingReminders(now)) {
    if (!(await tracker.claimMeetingReminder(group.id, now))) continue;
    try {
      await tg("sendMessage", { chat_id: group.telegramChatId, text: formatMeetingReminder(group, today), parse_mode: "HTML" });
      sent++;
    } catch (error) {
      await tracker.releaseMeetingReminder(group.id);
      console.warn(`[bot] reminder for group ${group.number} failed:`, error instanceof Error ? error.message : error);
    }
  }
  return sent;
}
