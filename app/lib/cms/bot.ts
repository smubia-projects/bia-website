import { Composer, type Api, type Context } from "grammy";
import type { BotCommand as TgBotCommand, Chat, InlineKeyboardButton, User } from "grammy/types";
import { runHref } from "@/app/admin/_components/runs";
import { CmsError, ensure, type Actor } from "./actor";
import {
  formatGroups,
  formatMeetingReminder,
  formatMilestone,
  formatTimeline,
  noonSgt,
  parseDate,
  parseStatus,
  shortDate,
  sgtDay,
  splitTitleAndDates,
  table,
} from "./bot-text";
import { todaySgt } from "./people";
import { escapeHtml as esc, SITE_URL, telegramApi } from "./telegram";
import { claimAccountLink, claimChatLink } from "./telegram-link";
import * as tracker from "./tracker";
import type { ProjectGroup, TrackerWho } from "./tracker";

/*
 * The DAP tracker bot's handlers, as a grammY Composer that telegram-bot.ts puts on the
 * site's one Bot. Telegram posts updates to /api/telegram/webhook. The bot only listens
 * in a connected group chat (or in a private chat with a linked admin). Permissions are
 * decided by tracker.ts; this file only reads commands and writes replies.
 *
 * Inside a group chat everything is scoped to that chat's group, admins
 * included, so one group's data never reaches another group's chat. Admins
 * reach other groups, and /groups, from a private chat with the bot.
 */

type TgChat = Pick<Chat, "id" | "type">;

// ── Context ──────────────────────────────────────────────────────────────

interface Ctx {
  chatId: number;
  /** The sender's Telegram user ID */
  fromId: number;
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
  /** A rich message (tables, headings): for views that list several things */
  rich?: boolean;
  markup?: { inline_keyboard: InlineKeyboardButton[][] };
}

/**
 * An "Open in CMS" button for a rich message, for admins in a private chat only: in a group chat
 * everyone sees the reply, and members can't sign in to the CMS. Telegram refuses buttons to
 * non-HTTPS addresses, so there is none on localhost.
 */
async function cmsLink(c: Ctx, group?: { id: number; cohortId: string }): Promise<string> {
  if (!c.actor || !c.isPrivate || !SITE_URL.startsWith("https://")) return "";
  const cohortId = group?.cohortId ?? (await tracker.trackerCohortId());
  const slug = cohortId && (await tracker.cohortSlug(cohortId));
  if (!slug) return "";
  const path = `${runHref("DAP", slug, "project-groups")}${group ? `/${group.id}` : ""}`;
  return `<tg-button-row><tg-button type="url" url="${SITE_URL}${path}">Open in CMS</tg-button></tg-button-row>`;
}

// ── Commands ─────────────────────────────────────────────────────────────

const requireActor = (c: Ctx): Actor => {
  ensure(c.actor, "Only DAP exco can do that.");
  return c.actor;
};

/**
 * "[g3] 5 rest": the project group's milestone, task or blocker number 5 (M5, T5 or B5 work too),
 * looked up as its ID. In a group chat it is that chat's group; an admin in a private chat adds g3.
 */
async function item(c: Ctx, args: string, kind: tracker.ItemKind, cmd: string) {
  const m = args.match(/^(?:g(\d+)\s+)?[#mtb]?(\d+)\b\s*([\s\S]*)$/i);
  ensure(m, `Usage: ${usageOf(cmd)}`);
  const group = await groupFor(c, m[1] ? Number(m[1]) : undefined);
  const number = Number(m[2]);
  return { id: await tracker.idByNumber(c.scope, group.id, kind, number), number, rest: m[3].trim(), group };
}

/** How a number reads in replies: M2, T5, B1. */
const label = (kind: tracker.ItemKind, number: number) => `${tracker.LABEL[kind]}${number}`;

/** The group a command is about: this chat's, or an admin's explicit one from a private chat. */
async function groupFor(c: Ctx, explicit?: number): Promise<ProjectGroup> {
  if (explicit !== undefined && c.actor) {
    ensure(c.isPrivate || explicit === c.group?.number, `This chat is Group ${c.group?.number}. Message me privately to work on another group.`);
    return c.group?.number === explicit ? c.group : tracker.groupByNumber(c.actor, explicit);
  }
  ensure(c.group, "Add the project group's number, e.g. /milestones g3");
  return c.group;
}

/** An optional leading "g3" or "3" naming a group. */
function leadingGroup(args: string, needG: boolean): [number | undefined, string] {
  const m = args.match(needG ? /^g(\d+)\b\s*([\s\S]*)$/i : /^g?(\d+)\b\s*([\s\S]*)$/i);
  return m ? [Number(m[1]), m[2].trim()] : [undefined, args];
}

export interface BotCommand {
  name: string;
  /** Admin commands are for DAP exco and exco admins; member commands for everyone in a connected chat */
  admin: boolean;
  /** Arguments as shown in /help, e.g. "<task#> todo|doing|done" */
  usage: string;
  /** One line for /help and the Telegram command menu (plain text, no HTML) */
  description: string;
  run: (c: Ctx, args: string) => Promise<Reply | string>;
}

const usageOf = (name: string) => {
  const cmd = COMMANDS.find((x) => x.name === name)!;
  return `/${cmd.name}${cmd.usage ? ` ${cmd.usage}` : ""}`;
};

/** Every tracker command. /help and the command menus (1.6) are built from this list. */
export const COMMANDS: BotCommand[] = [
  // ── Members ──
  {
    name: "milestones",
    admin: false,
    usage: "",
    description: "Timeline and progress",
    async run(c, args) {
      const [n] = leadingGroup(args, false);
      const group = await groupFor(c, n);
      const list = await tracker.getTimeline(c.scope, group.id);
      return { text: formatTimeline(group, list, c.today) + (await cmsLink(c, group)), rich: true };
    },
  },
  {
    name: "task",
    admin: false,
    usage: "<milestone#> title [by 20 Nov]",
    description: "Add a task",
    async run(c, args) {
      const m = await item(c, args, "milestone", "task");
      const p = splitTitleAndDates(m.rest, c.today);
      ensure(p.title, `Usage: ${usageOf("task")}`);
      const s = await tracker.addSubtask(c.scope, { milestoneId: m.id, title: p.title, dueOn: p.dueOn });
      return `Added task <b>${label("task", s.number)}</b> to ${label("milestone", m.number)}: ${esc(s.title)}${s.dueOn ? `, due ${shortDate(s.dueOn, c.today)}` : ""}.`;
    },
  },
  {
    name: "edittask",
    admin: false,
    usage: "<task#> new title [by 20 Nov]",
    description: "Rename a task or change its due date",
    async run(c, args) {
      const t = await item(c, args, "task", "edittask");
      const p = splitTitleAndDates(t.rest, c.today);
      ensure(p.title || p.dueOn, "Give a new title, a new due date (by 20 Nov), or both.");
      const s = await tracker.updateSubtask(c.scope, t.id, { ...(p.title ? { title: p.title } : {}), ...(p.dueOn ? { dueOn: p.dueOn } : {}) });
      return `Updated task <b>${label("task", s.number)}</b>: ${esc(s.title)}.`;
    },
  },
  {
    name: "taskstatus",
    admin: false,
    usage: "<task#> todo|doing|done",
    description: "Set a task's status",
    run: (c, args) => setTaskStatus(c, args, null),
  },
  {
    name: "taskdone",
    admin: false,
    usage: "<task#>",
    description: "Mark a task done",
    run: (c, args) => setTaskStatus(c, args, "done"),
  },
  {
    name: "assign",
    admin: false,
    usage: "<task#> name|me|none",
    description: "Assign a task",
    async run(c, args) {
      const t = await item(c, args, "task", "assign");
      ensure(t.rest, `Usage: ${usageOf("assign")}`);
      const a = await tracker.assignSubtask(c.scope, t.id, /^(none|nobody|clear)$/i.test(t.rest) ? null : t.rest);
      const task = `Task <b>${label("task", a.task.number)}</b>`;
      if (!a.assignee) return `${task} is unassigned.`;
      return a.onList ? `${task} assigned to ${esc(a.assignee)}.` : `${task} assigned to "${esc(a.assignee)}" (not on the member list).`;
    },
  },
  {
    name: "deltask",
    admin: false,
    usage: "<task#>",
    description: "Delete a task",
    async run(c, args) {
      const t = await item(c, args, "task", "deltask");
      return confirm(c, `Delete task ${label("task", t.number)}?`, `t:${t.id}:${t.number}`);
    },
  },
  {
    name: "blocker",
    admin: false,
    usage: "<milestone#> what is blocking you",
    description: "Log a blocker",
    async run(c, args) {
      const m = await item(c, args, "milestone", "blocker");
      ensure(m.rest, `Usage: ${usageOf("blocker")}`);
      const b = await tracker.addBlocker(c.scope, { milestoneId: m.id, description: m.rest });
      return `🚧 Logged blocker <b>${label("blocker", b.number)}</b> on ${label("milestone", m.number)}. Close it with /resolve ${c.isPrivate ? `g${m.group.number} ` : ""}${b.number}.`;
    },
  },
  {
    name: "editblocker",
    admin: false,
    usage: "<blocker#> text",
    description: "Edit a blocker",
    async run(c, args) {
      const x = await item(c, args, "blocker", "editblocker");
      ensure(x.rest, `Usage: ${usageOf("editblocker")}`);
      const b = await tracker.updateBlocker(c.scope, x.id, { description: x.rest });
      return `Updated blocker <b>${label("blocker", b.number)}</b>.`;
    },
  },
  {
    name: "resolve",
    admin: false,
    usage: "<blocker#>",
    description: "Resolve a blocker",
    run: (c, args) => setBlockerStatus(c, args, "resolve"),
  },
  {
    name: "reopenblocker",
    admin: false,
    usage: "<blocker#>",
    description: "Reopen a blocker",
    run: (c, args) => setBlockerStatus(c, args, "reopenblocker"),
  },
  {
    name: "delblocker",
    admin: false,
    usage: "<blocker#>",
    description: "Delete a blocker",
    async run(c, args) {
      const b = await item(c, args, "blocker", "delblocker");
      return confirm(c, `Delete blocker ${label("blocker", b.number)}?`, `b:${b.id}:${b.number}`);
    },
  },
  {
    name: "meeting",
    admin: false,
    usage: "[date]",
    description: "Log a meeting with your mentors",
    async run(c, args) {
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
    },
  },
  {
    name: "help",
    admin: false,
    usage: "",
    description: "List the commands",
    run: async (c) => helpText(c),
  },

  // ── DAP exco ──
  {
    name: "groups",
    admin: true,
    usage: "",
    description: "List project groups (private chat)",
    async run(c) {
      const actor = requireActor(c);
      ensure(c.isPrivate, "Use /groups in a private chat with me.");
      const cohortId = await tracker.trackerCohortId();
      return { text: formatGroups(cohortId ? await tracker.listProjectGroups(actor, cohortId) : [], c.today) + (await cmsLink(c)), rich: true };
    },
  },
  {
    name: "milestone",
    admin: true,
    usage: "[g3] title [from 1 Dec] by 15 Dec",
    description: "Add a milestone",
    async run(c, args) {
      const actor = requireActor(c);
      const [n, rest] = leadingGroup(args, true);
      const group = await groupFor(c, n);
      const p = splitTitleAndDates(rest, c.today);
      ensure(p.title, `Usage: ${usageOf("milestone")}`);
      ensure(!p.badDue, `Couldn't read the date "${p.badDue}". Try 15 Dec or 2026-12-15.`);
      ensure(p.dueOn, "A milestone needs a due date: /milestone title by 15 Dec");
      const m = await tracker.saveMilestone(actor, { groupId: group.id, title: p.title, startsOn: p.startsOn, dueOn: p.dueOn });
      return `Added milestone <b>${label("milestone", m.number)}</b> ${esc(m.title)}, due ${shortDate(m.dueOn, c.today)} (Group ${group.number}).`;
    },
  },
  {
    name: "editmilestone",
    admin: true,
    usage: "<milestone#> title [from …] [by …]",
    description: "Edit a milestone",
    async run(c, args) {
      const actor = requireActor(c);
      const x = await item(c, args, "milestone", "editmilestone");
      const cur = await tracker.getMilestone(c.scope, x.id);
      const p = splitTitleAndDates(x.rest, c.today);
      ensure(!p.badDue, `Couldn't read the date "${p.badDue}". Try 15 Dec or 2026-12-15.`);
      ensure(p.title || p.dueOn, "Give a new title, a new due date (by 15 Dec), or both.");
      const m = await tracker.saveMilestone(actor, {
        id: x.id,
        groupId: cur.groupId,
        title: p.title || cur.title,
        dueOn: p.dueOn ?? cur.dueOn,
        ...(p.startsOn ? { startsOn: p.startsOn } : {}),
      });
      return `Updated <b>${label("milestone", m.number)}</b> ${esc(m.title)}, due ${shortDate(m.dueOn, c.today)}.`;
    },
  },
  {
    name: "done",
    admin: true,
    usage: "<milestone#>",
    description: "Mark a milestone done",
    run: (c, args) => setMilestoneStatus(c, args, "done"),
  },
  {
    name: "status",
    admin: true,
    usage: "<milestone#> todo|doing|done",
    description: "Set a milestone's status",
    run: (c, args) => setMilestoneStatus(c, args, null),
  },
  {
    name: "delmilestone",
    admin: true,
    usage: "<milestone#>",
    description: "Delete a milestone",
    async run(c, args) {
      requireActor(c);
      const m = await item(c, args, "milestone", "delmilestone");
      return confirm(c, `Delete milestone ${label("milestone", m.number)} with all its tasks and blockers?`, `m:${m.id}:${m.number}`);
    },
  },
  {
    name: "reminders",
    admin: true,
    usage: "[g3] on|off",
    description: "Turn meeting reminders on or off",
    async run(c, args) {
      const actor = requireActor(c);
      const m = args.match(/^(?:g?(\d+)\s+)?(on|off)$/i);
      ensure(m, `Usage: ${usageOf("reminders")}`);
      const group = await groupFor(c, m[1] ? Number(m[1]) : undefined);
      const g = await tracker.setMeetingReminders(actor, group.id, m[2].toLowerCase() === "on");
      return `Meeting reminders for Group ${g.number} are ${g.meetingRemindersOn ? "on" : "off"}.`;
    },
  },
];

async function setTaskStatus(c: Ctx, args: string, fixed: "done" | null) {
  const t = await item(c, args, "task", fixed ? "taskdone" : "taskstatus");
  const status = fixed ?? parseStatus(t.rest);
  ensure(status, "Status must be todo, doing or done.");
  const s = await tracker.updateSubtask(c.scope, t.id, { status });
  return `${status === "done" ? "✅" : status === "in_progress" ? "⏳" : "⬜"} Task <b>${label("task", s.number)}</b> ${esc(s.title)} is now ${status.replace("_", " ")}.`;
}

async function setMilestoneStatus(c: Ctx, args: string, fixed: "done" | null) {
  const actor = requireActor(c);
  const x = await item(c, args, "milestone", fixed ? "done" : "status");
  const status = fixed ?? parseStatus(x.rest);
  ensure(status, "Status must be todo, doing or done.");
  const m = await tracker.setMilestoneStatus(actor, x.id, status);
  return `${m.status === "done" ? "✅" : "⏳"} <b>${label("milestone", m.number)}</b> ${esc(m.title)} is now ${m.status.replace("_", " ")}.`;
}

async function setBlockerStatus(c: Ctx, args: string, cmd: "resolve" | "reopenblocker") {
  const x = await item(c, args, "blocker", cmd);
  const b = await tracker.updateBlocker(c.scope, x.id, { status: cmd === "resolve" ? "resolved" : "open" });
  const name = label("blocker", b.number);
  return b.status === "resolved" ? `✔️ Blocker <b>${name}</b> resolved.` : `🚧 Blocker <b>${name}</b> reopened.`;
}

/** /help: a table of commands (tap one to send it). Admin commands and the g3 tip only in a private chat. */
function helpText(c: Ctx): Reply {
  const rows = (admin: boolean) => COMMANDS.filter((x) => x.admin === admin).map((x) => [esc(usageOf(x.name)), esc(x.description)]);
  const parts = ["<h3>Tracker Commands</h3>", table(["Command", "Description"], rows(false))];
  if (c.actor && c.isPrivate) {
    parts.push("<h3>DAP Exco Commands</h3>", table(["Command", "Description"], rows(true)));
    parts.push("<p>Add g3 to a command to reach Group 3 of the current cohort (the live one, else the newest).</p>");
  }
  return { text: parts.join(""), rich: true };
}

/** Delete and Cancel buttons only the person who asked can press: their Telegram ID ends the data. */
const confirm = (c: Ctx, text: string, target: string): Reply => ({
  text,
  markup: { inline_keyboard: [[{ text: "Delete", callback_data: `y:${target}:${c.fromId}` }, { text: "Cancel", callback_data: `n:${c.fromId}` }]] },
});

// ── Handlers ─────────────────────────────────────────────────────────────

export const trackerBot = new Composer<Context>();

trackerBot.on("message:migrate_to_chat_id", (ctx) => tracker.migrateChat(ctx.chat.id, ctx.msg.migrate_to_chat_id));
trackerBot.on("message:migrate_from_chat_id", (ctx) => tracker.migrateChat(ctx.msg.migrate_from_chat_id, ctx.chat.id));
trackerBot.command("start", (ctx) => runCommand(ctx, "start", ctx.match.trim()));
for (const cmd of COMMANDS) trackerBot.command(cmd.name, (ctx) => runCommand(ctx, cmd.name, ctx.match.trim()));
// Any other command for this bot (commands are lower-case) gets "Unknown command".
trackerBot.hears(/^\/\w+(?:@(\w+))?/, (ctx) => {
  const to = ctx.match[1];
  if (!to || to.toLowerCase() === ctx.me.username.toLowerCase()) return runCommand(ctx, "", "");
});
trackerBot.on("callback_query:data", onCallback);
trackerBot.on("callback_query", (ctx) => ctx.answerCallbackQuery());

const displayName = (u: User) => [u.first_name, u.last_name].filter(Boolean).join(" ") || "Someone";

async function contextFor(chat: TgChat, from: User): Promise<Ctx | null> {
  const sender = await tracker.resolveSender(chat.id, from.id, displayName(from));
  if (!sender) return null;
  const isPrivate = chat.type === "private";
  // Group chats other than a connected one are ignored; so are non-members.
  if (!isPrivate && !sender.group) return null;
  return {
    chatId: chat.id,
    fromId: from.id,
    isPrivate,
    name: sender.who.name,
    who: sender.who,
    actor: sender.actor,
    group: sender.group,
    scope: isPrivate ? sender.who : tracker.memberWho(sender.group!.id, sender.who.name),
    today: todaySgt(),
  };
}

async function runCommand(ctx: Context, name: string, args: string) {
  const m = ctx.message;
  if (!m?.from || m.from.is_bot) return;
  const isPrivate = m.chat.type === "private";
  const say = async (r: Reply | string) => {
    const reply: Reply = typeof r === "string" ? { text: r } : r;
    const replyTo = { message_id: m.message_id, allow_sending_without_reply: true };
    if (reply.rich) {
      await ctx.replyWithRichMessage({ html: reply.text }, { reply_parameters: replyTo, ...(reply.markup ? { reply_markup: reply.markup } : {}) });
      return;
    }
    await ctx.reply(reply.text, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      reply_parameters: { message_id: m.message_id, allow_sending_without_reply: true },
      ...(reply.markup ? { reply_markup: reply.markup } : {}),
    });
  };

  try {
    // /start <code>: a one-time link from the CMS (telegram-link.ts).
    if (name === "start" && args && isPrivate) {
      const actor = await claimAccountLink(args, { id: m.from.id, name: displayName(m.from), username: m.from.username ?? "" });
      return say(`Linked. I know you as DAP exco now (<b>${esc(actor.name)}</b>). To use me in a project group's chat, press Connect Telegram Chat on that group's page in the CMS.`);
    }
    if (name === "start" && args) {
      const g = await claimChatLink(args, m.chat.id);
      return say(`Connected: this chat is <b>Group ${g.number}</b>${g.name ? ` (${esc(g.name)})` : ""}. Everyone here can log tasks, blockers and meetings. Send /help for the commands.`);
    }

    const c = await contextFor(m.chat, m.from);
    if (!c) {
      // A private chat gets an answer; a group chat that isn't connected stays silent.
      if (isPrivate) return say("I don't know you yet. DAP exco: link your Telegram account in the CMS under Settings › Telegram.");
      return;
    }
    if (name === "start") return say(helpText(c));
    const cmd = COMMANDS.find((x) => x.name === name);
    return say(cmd ? await cmd.run(c, args) : "Unknown command. Send /help for the list.");
  } catch (error) {
    if (error instanceof CmsError) return say(`⚠️ ${esc(error.message)}`);
    console.error("[bot] command failed", name, error);
    return say("Something went wrong. Try again in a moment.");
  }
}

// ── Buttons ──────────────────────────────────────────────────────────────

async function onCallback(ctx: Context & { callbackQuery: { data: string } }) {
  const q = ctx.callbackQuery;
  const msg = q.message;
  const answer = async (text?: string) => {
    await ctx.answerCallbackQuery(text ? { text } : undefined);
  };
  if (!msg) return answer();

  // Buttons are authorised by whoever pressed them, not by who the message was meant for.
  const c = await contextFor(msg.chat, q.from);
  if (!c) return answer("Not allowed");

  const edit = (text: string) => ctx.editMessageText(text, { parse_mode: "HTML" });
  try {
    // Delete and Cancel end with the Telegram ID of the person who asked; nobody else can press them.
    if (/^[yn]:/.test(q.data) && Number(q.data.split(":").pop()) !== q.from.id) return answer("Only the person who asked can do that.");
    if (q.data.startsWith("n:")) await edit("Cancelled.");
    else if (q.data.startsWith("m:")) {
      const m = await tracker.getMilestone(c.scope, Number(q.data.slice(2)));
      const members = await tracker.listMembers(c.scope, m.groupId);
      const link = await cmsLink(c, await tracker.projectGroup(c.scope, m.groupId));
      await ctx.replyWithRichMessage({ html: formatMilestone(m, members, c.today) + link });
    } else if (q.data.startsWith("y:")) {
      const [, kind, raw, number] = q.data.split(":");
      const id = Number(raw);
      if (kind === "m") {
        const actor = requireActor(c);
        await tracker.getMilestone(c.scope, id); // never reaches past this chat's group
        await tracker.deleteMilestone(actor, id);
      }
      else if (kind === "t") await tracker.deleteSubtask(c.scope, id);
      else if (kind === "b") await tracker.deleteBlocker(c.scope, id);
      const what = ({ m: "milestone", t: "task", b: "blocker" } as const)[kind as "m" | "t" | "b"];
      await edit(`Deleted ${what} ${label(what, Number(number))}.`);
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
export async function sendMeetingReminders(api: Api = telegramApi(), now = new Date()) {
  let sent = 0;
  const today = sgtDay(now);
  for (const group of await tracker.dueMeetingReminders(now)) {
    if (!(await tracker.claimMeetingReminder(group.id, now))) continue;
    try {
      await api.sendRichMessage(group.telegramChatId!, { html: formatMeetingReminder(group, today) });
      sent++;
    } catch (error) {
      await tracker.releaseMeetingReminder(group.id);
      console.warn(`[bot] reminder for group ${group.number} failed:`, error instanceof Error ? error.message : error);
    }
  }
  return sent;
}

// ── Command menus ────────────────────────────────────────────────────────

const menu = (list: BotCommand[]): TgBotCommand[] => list.map((c) => ({ command: c.name, description: c.description }));

/**
 * The "/" menus Telegram shows, from COMMANDS: member commands in every group chat, all commands
 * in private chats (where only linked admins get answers). Two calls cover every chat, so nothing
 * needs updating when a chat is connected or disconnected. Run from Set Webhook.
 */
export async function syncBotCommands(api: Api = telegramApi()) {
  await api.setMyCommands(menu(COMMANDS.filter((c) => !c.admin)), { scope: { type: "all_group_chats" } });
  await api.setMyCommands(menu(COMMANDS), { scope: { type: "all_private_chats" } });
}
