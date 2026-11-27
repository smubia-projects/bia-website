import "server-only";
import { Composer, type Api, type Context } from "grammy";
import type { BotCommand as TgBotCommand, Chat, User } from "grammy/types";
import { runHref } from "@/app/admin/_components/runs";
import { CmsError, ensure } from "@/server/core/actor";
import { groupFor, requireActor, type Ctx, type Reply } from "./bot-core";
import { FLOWS, flowCommand, flowScreen, parseFlowData, parseRef, typedText, type FlowId } from "./bot-flows";
import { formatGroups, formatMeetingReminder, formatMilestone, formatTaskDeadlines, formatTasks, formatTimeline, parseDate, parseStatus, splitTitleAndDates, table } from "./bot-text";
import { noonSgt, shortDate, sgtDay, todaySgt } from "@/shared/time";
import { escapeHtml as esc, SITE_URL, telegramApi, telegramToken } from "@/server/integrations/telegram/client";
import { claimAccountLink, claimChatLink } from "@/server/people/telegram-link";
import * as tracker from "./service";

/*
 * The DAP tracker bot's handlers, as a grammY Composer that src/server/bot.ts puts on the
 * site's one Bot. Telegram posts updates to /api/telegram/webhook. The bot only listens
 * in a connected group chat (or in a private chat with a linked admin). Permissions are
 * decided by service.ts; this file only reads commands and writes replies.
 *
 * Inside a group chat everything is scoped to that chat's group, admins
 * included, so one group's data never reaches another group's chat. Admins
 * reach other groups, and /groups, from a private chat with the bot.
 */

type TgChat = Pick<Chat, "id" | "type">;

// ── Context ──────────────────────────────────────────────────────────────

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

/** An optional leading "g3" or "3" naming a group. */
function leadingGroup(args: string, needG: boolean): [number | undefined, string] {
  const m = args.match(needG ? /^g(\d+)\b\s*([\s\S]*)$/i : /^g?(\d+)\b\s*([\s\S]*)$/i);
  return m ? [Number(m[1]), m[2].trim()] : [undefined, args];
}

/** What a command was given, without insisting on any of it: "[g3] [5] rest". */
function peek(args: string) {
  const m = args.match(/^(?:g(\d+)\b\s*)?(?:[#mtb]?(\d+)\b\s*)?([\s\S]*)$/i)!;
  return { group: m[1] ? Number(m[1]) : undefined, number: m[2] ? Number(m[2]) : undefined, rest: m[3].trim() };
}

const ITEM = { m: "milestone", t: "task", b: "blocker" } as const;

/**
 * A command sent without everything it needs starts a button flow (bot-flows.ts) instead of failing:
 * the options as buttons, a reply for any typed answer, then Confirm. Returns null when the command
 * has all it needs, so it just runs. A command with everything typed in keeps its one-line speed.
 */
async function begin(c: Ctx, id: FlowId, args: string): Promise<Reply | string | null> {
  const def = FLOWS[id];
  let group: number | undefined;
  let picks: string[] = [];
  let typed = false;
  if (id === "rm") {
    if (/^(?:g?\d+\s+)?(on|off)$/i.test(args)) return null;
    group = args.match(/^g?(\d+)$/i) ? Number(args.replace(/\D/g, "")) : undefined;
  } else {
    const p = peek(args);
    const first = def.pick[0] as keyof typeof ITEM | undefined;
    const hasItem = first !== undefined && first in ITEM;
    const needsRest = Boolean(def.ask) || def.pick.includes("s") || def.pick.includes("w");
    if (hasItem ? p.number !== undefined && (!needsRest || p.rest !== "") : p.rest !== "") return null;
    group = p.group;
    if (hasItem && p.number !== undefined) {
      // A number that doesn't exist is an error now, not after the person has picked everything else.
      await tracker.idByNumber(c.scope, (await groupFor(c, group)).id, ITEM[first], p.number);
      picks = [String(p.number)];
    } else typed = Boolean(def.ask) && p.rest !== "";
  }
  const step = await flowScreen(c, { flow: id, g: group, picks, typed });
  if ("reply" in step) return step.reply;
  if ("prompt" in step) return step.prompt.reply;
  return runNamed(step.run.name, c, step.run.args);
}

const runNamed = async (name: string, c: Ctx, args: string) => COMMANDS.find((x) => x.name === name)!.run(c, args);

export interface BotCommand {
  name: string;
  /** Still answers, but is left out of /help and the command menus (an old name that points to the new one) */
  hidden?: boolean;
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
const COMMANDS: BotCommand[] = [
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
    name: "addtask",
    admin: false,
    usage: "[milestone#] title [by DD/MM/YYYY]",
    description: "Add a task",
    async run(c, args) {
      const flow = await begin(c, "at", args);
      if (flow) return flow;
      const m = await item(c, args, "milestone", "addtask");
      const p = splitTitleAndDates(m.rest, c.today);
      ensure(!p.badDue, `Couldn't read the date "${p.badDue}". Use DD/MM/YYYY, for example 20/11/2026.`);
      ensure(p.title, `Usage: ${usageOf("addtask")}`);
      const s = await tracker.addSubtask(c.scope, { milestoneId: m.id, title: p.title, dueOn: p.dueOn });
      return `Added task <b>${label("task", s.number)}</b> to ${label("milestone", m.number)}: ${esc(s.title)}${s.dueOn ? `, due ${shortDate(s.dueOn, c.today)}` : ""}.`;
    },
  },
  {
    name: "task",
    hidden: true,
    admin: false,
    usage: "",
    description: "Renamed",
    run: async () => "/task is now /addtask (add a task) and /listtask (list tasks).",
  },
  {
    name: "listtask",
    admin: false,
    usage: "[g3] [milestone#]",
    description: "List tasks",
    async run(c, args) {
      const [n, rest] = leadingGroup(args, true);
      const only = rest.match(/^[#m]?(\d+)$/i);
      ensure(!rest || only, `Usage: ${usageOf("listtask")}`);
      const group = await groupFor(c, n);
      const list = await tracker.getTimeline(c.scope, group.id);
      if (only) await tracker.idByNumber(c.scope, group.id, "milestone", Number(only[1])); // not found → a clear error
      const members = await tracker.listMembers(c.scope, group.id);
      return { text: formatTasks(group, list, members, c.today, only ? Number(only[1]) : undefined) + (await cmsLink(c, group)), rich: true };
    },
  },
  {
    name: "edittask",
    admin: false,
    usage: "[task#] new title [by DD/MM/YYYY]",
    description: "Rename a task or change its due date",
    async run(c, args) {
      const flow = await begin(c, "et", args);
      if (flow) return flow;
      const t = await item(c, args, "task", "edittask");
      const p = splitTitleAndDates(t.rest, c.today);
      ensure(!p.badDue, `Couldn't read the date "${p.badDue}". Use DD/MM/YYYY, for example 20/11/2026.`);
      ensure(p.title || p.dueOn, "Give a new title, a new due date (by DD/MM/YYYY), or both.");
      const s = await tracker.updateSubtask(c.scope, t.id, { ...(p.title ? { title: p.title } : {}), ...(p.dueOn ? { dueOn: p.dueOn } : {}) });
      return `Updated task <b>${label("task", s.number)}</b>: ${esc(s.title)}.`;
    },
  },
  {
    name: "taskstatus",
    admin: false,
    usage: "[task#] todo|doing|done",
    description: "Set a task's status",
    run: (c, args) => setTaskStatus(c, args, null),
  },
  {
    name: "taskdone",
    admin: false,
    usage: "[task#]",
    description: "Mark a task done",
    run: (c, args) => setTaskStatus(c, args, "done"),
  },
  {
    name: "assign",
    admin: false,
    usage: "[task#] name|me|none",
    description: "Assign a task",
    async run(c, args) {
      const flow = await begin(c, "as", args);
      if (flow) return flow;
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
    usage: "[task#]",
    description: "Delete a task",
    async run(c, args) {
      const flow = await begin(c, "dt", args);
      if (flow) return flow;
      const t = await item(c, args, "task", "deltask");
      return confirm(c, `Delete task ${label("task", t.number)}?`, `t:${t.id}:${t.number}`);
    },
  },
  {
    name: "blocker",
    admin: false,
    usage: "[milestone#] what is blocking you",
    description: "Log a blocker",
    async run(c, args) {
      const flow = await begin(c, "ab", args);
      if (flow) return flow;
      const m = await item(c, args, "milestone", "blocker");
      ensure(m.rest, `Usage: ${usageOf("blocker")}`);
      const b = await tracker.addBlocker(c.scope, { milestoneId: m.id, description: m.rest });
      return `🚧 Logged blocker <b>${label("blocker", b.number)}</b> on ${label("milestone", m.number)}. Close it with /resolve ${c.isPrivate ? `g${m.group.number} ` : ""}${b.number}.`;
    },
  },
  {
    name: "editblocker",
    admin: false,
    usage: "[blocker#] text",
    description: "Edit a blocker",
    async run(c, args) {
      const flow = await begin(c, "eb", args);
      if (flow) return flow;
      const x = await item(c, args, "blocker", "editblocker");
      ensure(x.rest, `Usage: ${usageOf("editblocker")}`);
      const b = await tracker.updateBlocker(c.scope, x.id, { description: x.rest });
      return `Updated blocker <b>${label("blocker", b.number)}</b>.`;
    },
  },
  {
    name: "resolve",
    admin: false,
    usage: "[blocker#]",
    description: "Resolve a blocker",
    run: (c, args) => setBlockerStatus(c, args, "resolve"),
  },
  {
    name: "reopenblocker",
    admin: false,
    usage: "[blocker#]",
    description: "Reopen a blocker",
    run: (c, args) => setBlockerStatus(c, args, "reopenblocker"),
  },
  {
    name: "delblocker",
    admin: false,
    usage: "[blocker#]",
    description: "Delete a blocker",
    async run(c, args) {
      const flow = await begin(c, "db", args);
      if (flow) return flow;
      const b = await item(c, args, "blocker", "delblocker");
      return confirm(c, `Delete blocker ${label("blocker", b.number)}?`, `b:${b.id}:${b.number}`);
    },
  },
  {
    name: "meeting",
    admin: false,
    usage: "[DD/MM/YYYY]",
    description: "Log a meeting with your mentors",
    async run(c, args) {
      const [n, rest] = leadingGroup(args, true);
      const group = await groupFor(c, n);
      let at = new Date();
      if (rest) {
        const day = parseDate(rest, c.today, true);
        ensure(day, `Couldn't read the date "${rest}". Use DD/MM/YYYY, for example 12/11/2026, or yesterday.`);
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
    usage: "[g3] title [from DD/MM/YYYY] by DD/MM/YYYY",
    description: "Add a milestone",
    async run(c, args) {
      const flow = await begin(c, "ms", args);
      if (flow) return flow;
      const actor = requireActor(c);
      const [n, rest] = leadingGroup(args, true);
      const group = await groupFor(c, n);
      const p = splitTitleAndDates(rest, c.today, true);
      ensure(p.title, `Usage: ${usageOf("milestone")}`);
      ensure(!p.badDue, `Couldn't read the date "${p.badDue}". Use DD/MM/YYYY, for example 15/12/2026.`);
      ensure(p.dueOn, "A milestone needs a due date: /milestone title by DD/MM/YYYY");
      const m = await tracker.saveMilestone(actor, { groupId: group.id, title: p.title, startsOn: p.startsOn, dueOn: p.dueOn });
      return `Added milestone <b>${label("milestone", m.number)}</b> ${esc(m.title)}, due ${shortDate(m.dueOn, c.today)} (Group ${group.number}).`;
    },
  },
  {
    name: "editmilestone",
    admin: true,
    usage: "[milestone#] title [from …] [by …]",
    description: "Edit a milestone",
    async run(c, args) {
      const flow = await begin(c, "em", args);
      if (flow) return flow;
      const actor = requireActor(c);
      const x = await item(c, args, "milestone", "editmilestone");
      const cur = await tracker.getMilestone(c.scope, x.id);
      const p = splitTitleAndDates(x.rest, c.today, true);
      ensure(!p.badDue, `Couldn't read the date "${p.badDue}". Use DD/MM/YYYY, for example 15/12/2026.`);
      ensure(p.title || p.dueOn, "Give a new title, a new due date (by DD/MM/YYYY), or both.");
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
    usage: "[milestone#]",
    description: "Mark a milestone done",
    run: (c, args) => setMilestoneStatus(c, args, "done"),
  },
  {
    name: "status",
    admin: true,
    usage: "[milestone#] todo|doing|done",
    description: "Set a milestone's status",
    run: (c, args) => setMilestoneStatus(c, args, null),
  },
  {
    name: "delmilestone",
    admin: true,
    usage: "[milestone#]",
    description: "Delete a milestone",
    async run(c, args) {
      const flow = await begin(c, "dm", args);
      if (flow) return flow;
      requireActor(c);
      const m = await item(c, args, "milestone", "delmilestone");
      return confirm(c, `Delete milestone ${label("milestone", m.number)} with all its tasks and blockers?`, `m:${m.id}:${m.number}`);
    },
  },
  {
    name: "reminders",
    admin: true,
    usage: "[g3] on|off",
    description: "Turn reminders on or off (meetings and task deadlines)",
    async run(c, args) {
      const flow = await begin(c, "rm", args);
      if (flow) return flow;
      const actor = requireActor(c);
      const m = args.match(/^(?:g?(\d+)\s+)?(on|off)$/i);
      ensure(m, `Usage: ${usageOf("reminders")}`);
      const group = await groupFor(c, m[1] ? Number(m[1]) : undefined);
      const g = await tracker.setMeetingReminders(actor, group.id, m[2].toLowerCase() === "on");
      return `Reminders for Group ${g.number} are ${g.meetingRemindersOn ? "on" : "off"}.`;
    },
  },
];

async function setTaskStatus(c: Ctx, args: string, fixed: "done" | null) {
  const flow = await begin(c, fixed ? "td" : "ts", args);
  if (flow) return flow;
  const t = await item(c, args, "task", fixed ? "taskdone" : "taskstatus");
  const status = fixed ?? parseStatus(t.rest);
  ensure(status, "Status must be todo, doing or done.");
  const s = await tracker.updateSubtask(c.scope, t.id, { status });
  return `${status === "done" ? "✅" : status === "in_progress" ? "⏳" : "⬜"} Task <b>${label("task", s.number)}</b> ${esc(s.title)} is now ${status.replace("_", " ")}.`;
}

async function setMilestoneStatus(c: Ctx, args: string, fixed: "done" | null) {
  const flow = await begin(c, fixed ? "dn" : "sm", args);
  if (flow) return flow;
  const actor = requireActor(c);
  const x = await item(c, args, "milestone", fixed ? "done" : "status");
  const status = fixed ?? parseStatus(x.rest);
  ensure(status, "Status must be todo, doing or done.");
  const m = await tracker.setMilestoneStatus(actor, x.id, status);
  return `${m.status === "done" ? "✅" : "⏳"} <b>${label("milestone", m.number)}</b> ${esc(m.title)} is now ${m.status.replace("_", " ")}.`;
}

async function setBlockerStatus(c: Ctx, args: string, cmd: "resolve" | "reopenblocker") {
  const flow = await begin(c, cmd === "resolve" ? "rb" : "ub", args);
  if (flow) return flow;
  const x = await item(c, args, "blocker", cmd);
  const b = await tracker.updateBlocker(c.scope, x.id, { status: cmd === "resolve" ? "resolved" : "open" });
  const name = label("blocker", b.number);
  return b.status === "resolved" ? `✔️ Blocker <b>${name}</b> resolved.` : `🚧 Blocker <b>${name}</b> reopened.`;
}

/** /help: a table of commands (tap one to send it). Admin commands and the g3 tip only in a private chat. */
function helpText(c: Ctx): Reply {
  const rows = (admin: boolean) => COMMANDS.filter((x) => x.admin === admin && !x.hidden).map((x) => [esc(usageOf(x.name)), esc(x.description)]);
  const parts = ["<h3>Tracker Commands</h3>", table(["Command", "Description"], rows(false)), "<p>Send a command on its own, such as /addtask, and I'll list the options to choose from, then ask you to confirm.</p>"];
  if (c.actor && c.isPrivate) {
    parts.push("<h3>DAP Exco Commands</h3>", table(["Command", "Description"], rows(true)));
    parts.push("<p>Add g3 to a command to reach Group 3 of the current cohort (the live one, else the newest).</p>");
  }
  return { text: parts.join(""), rich: true };
}

/**
 * /start: the button that opens the tracker Mini App. In a private chat (admins only get this far) it opens
 * the app directly; Telegram allows that only there. A group chat gets a link to the app's direct link
 * (TELEGRAM_MINI_APP_NAME, the short name from BotFather's /newapp) that names this project group; the app
 * still checks the person is in the chat. Telegram refuses buttons to non-HTTPS addresses, so on localhost
 * and until the app is set up, /start shows the command list as before.
 */
function startReply(ctx: Context, c: Ctx): Reply {
  if (!SITE_URL.startsWith("https://")) return helpText(c);
  const more = "Send /help for the commands.";
  if (c.isPrivate) {
    return { text: `<b>Project tracker</b>\nOpen it to see every project group's milestones and tasks. ${more}`, markup: { inline_keyboard: [[{ text: "Open tracker", web_app: { url: `${SITE_URL}/mini-app` } }]] } };
  }
  const app = process.env.TELEGRAM_MINI_APP_NAME;
  if (!app || !c.group) return helpText(c);
  const url = `https://t.me/${ctx.me.username}/${app}?startapp=g${c.group.number}`;
  return { text: `<b>Project tracker: Group ${c.group.number}${c.group.name ? ` (${esc(c.group.name)})` : ""}</b>\nOpen it to see this project group's milestones and tasks. ${more}`, markup: { inline_keyboard: [[{ text: "Open tracker", url }]] } };
}

/** Delete and Cancel buttons only the person who asked can press: their Telegram ID ends the data. */
const confirm = (c: Ctx, text: string, target: string): Reply => ({
  text,
  markup: { inline_keyboard: [[{ text: "Delete", callback_data: `y:${target}:${c.fromId}` }, { text: "Cancel", callback_data: `n:${c.fromId}` }]] },
});

// ── Handlers ─────────────────────────────────────────────────────────────

export const trackerBot = new Composer<Context>();

// Commands are matched in lower case (the menu needs it), so /addTask and /ADDTASK work like /addtask.
trackerBot.use((ctx, next) => {
  const m = ctx.message;
  const e = m?.entities?.[0];
  if (m?.text && e?.type === "bot_command" && e.offset === 0) {
    m.text = m.text.slice(0, e.length).replace(/^\/[^@\s]*/, (name) => name.toLowerCase()) + m.text.slice(e.length);
  }
  return next();
});
trackerBot.on("message:migrate_to_chat_id", (ctx) => tracker.migrateChat(ctx.chat.id, ctx.msg.migrate_to_chat_id));
trackerBot.on("message:migrate_from_chat_id", (ctx) => tracker.migrateChat(ctx.msg.migrate_from_chat_id, ctx.chat.id));
trackerBot.command("start", (ctx) => runCommand(ctx, "start", ctx.match.trim()));
for (const cmd of COMMANDS) trackerBot.command(cmd.name, (ctx) => runCommand(ctx, cmd.name, ctx.match.trim()));
// Any other command for this bot (commands are lower-case) gets "Unknown command".
trackerBot.hears(/^\/\w+(?:@(\w+))?/, (ctx) => {
  const to = ctx.match[1];
  if (!to || to.toLowerCase() === ctx.me.username.toLowerCase()) return runCommand(ctx, "", "");
});
// A typed answer to one of the button flows' prompts (a reply to the bot's message).
trackerBot.on("message:text", onReply);
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
    if (reply.forceReply) {
      await ctx.reply(reply.text, {
        parse_mode: "HTML",
        reply_parameters: replyTo,
        reply_markup: { force_reply: true, selective: true, input_field_placeholder: reply.forceReply },
      });
      return;
    }
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
    // /start <code>: a one-time link from the CMS (src/server/people/telegram-link.ts).
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
    if (name === "start") return say(startReply(ctx, c));
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
    const flow = parseFlowData(q.data);
    if (flow) return await onFlowCallback(ctx, c, flow, msg, answer);
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

/** The text of the message a button's message replies to (the person's command or typed answer). */
const repliedText = (msg: object) => ("reply_to_message" in msg ? (msg.reply_to_message as { text?: string } | undefined)?.text : undefined);

/** Shows a command's result in place of the buttons. */
const showResult = (ctx: Context, r: Reply | string) => {
  const reply = typeof r === "string" ? { text: r } : r;
  return ctx.editMessageText(reply.text, { parse_mode: "HTML", link_preview_options: { is_disabled: true }, ...(reply.markup ? { reply_markup: reply.markup } : {}) });
};

/** A step button ("f:…") or Confirm ("ok:…") of a button flow. Only the person who started it can press them. */
async function onFlowCallback(ctx: Context, c: Ctx, flow: NonNullable<ReturnType<typeof parseFlowData>>, msg: object, answer: (text?: string) => Promise<void>) {
  if (flow.from !== c.fromId) return answer("Only the person who asked can do that.");
  const { state } = flow;
  try {
    if (flow.prefix === "ok") {
      const cmd = await flowCommand(c, state, FLOWS[state.flow].ask ? typedText(repliedText(msg)) : undefined);
      await showResult(ctx, await runNamed(cmd.name, c, cmd.args));
      return answer();
    }
    const step = await flowScreen(c, state, state.typed ? typedText(repliedText(msg)) || undefined : undefined);
    if ("reply" in step) await showResult(ctx, step.reply);
    else if ("prompt" in step) {
      await showResult(ctx, step.prompt.left);
      await ctx.reply(step.prompt.reply.text, {
        parse_mode: "HTML",
        reply_markup: { force_reply: true, selective: true, input_field_placeholder: step.prompt.reply.forceReply },
      });
    } else await showResult(ctx, await runNamed(step.run.name, c, step.run.args));
    return answer();
  } catch (error) {
    if (!(error instanceof CmsError)) throw error;
    // On Confirm the reason replaces the buttons, so it is not lost with the popup; elsewhere it is a notice.
    if (flow.prefix === "ok") await showResult(ctx, `⚠️ ${esc(error.message)}`);
    return answer(flow.prefix === "ok" ? undefined : error.message.slice(0, 190));
  }
}

/**
 * The person's typed answer to a prompt: checked, then shown back with a Confirm button. Only a reply
 * to the bot's own prompt counts, and only from the person it asked; anything else is ignored.
 */
async function onReply(ctx: Context) {
  const m = ctx.message;
  const prompt = m?.reply_to_message;
  if (!m?.text || !m.from || m.from.is_bot || !prompt || prompt.from?.id !== ctx.me.id) return;
  const ref = parseRef(prompt.text);
  if (!ref || ref.from !== m.from.id) return;
  const c = await contextFor(m.chat, m.from);
  if (!c) return;
  const say = (text: string, markup?: Reply["markup"]) =>
    ctx.reply(text, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      reply_parameters: { message_id: m.message_id, allow_sending_without_reply: true },
      ...(markup ? { reply_markup: markup } : {}),
    });
  try {
    const step = await flowScreen(c, ref.state, m.text.trim());
    if ("reply" in step) await say(step.reply.text, step.reply.markup);
  } catch (error) {
    if (!(error instanceof CmsError)) throw error;
    await say(`⚠️ ${esc(error.message)}\nReply to my message above to try again.`);
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

// ── Task deadline alerts (called by the daily cron) ──────────────────────

/**
 * Posts each connected group's task deadline alert: tasks due within a week, and tasks whose deadline has
 * passed, each task once per due date. Returns how many tasks were alerted. A failed send is released so
 * tomorrow's run retries, and one group failing never stops the others.
 */
export async function sendTaskDeadlineAlerts(api: Api = telegramApi(), now = new Date()) {
  const today = sgtDay(now);
  let alerted = 0;
  for (const { group, soon, overdue } of await tracker.dueTaskAlerts(today)) {
    const gotSoon = new Set(await tracker.claimTaskAlerts("soon", soon.map((a) => a.task.id), now));
    const gotOverdue = new Set(await tracker.claimTaskAlerts("overdue", overdue.map((a) => a.task.id), now));
    const nowSoon = soon.filter((a) => gotSoon.has(a.task.id));
    const nowOverdue = overdue.filter((a) => gotOverdue.has(a.task.id));
    if (!nowSoon.length && !nowOverdue.length) continue;
    try {
      const members = await tracker.listMembers(tracker.memberWho(group.id, "Reminder"), group.id);
      await api.sendRichMessage(group.telegramChatId!, { html: formatTaskDeadlines(group, nowSoon, nowOverdue, members, today) });
      alerted += nowSoon.length + nowOverdue.length;
    } catch (error) {
      await tracker.releaseTaskAlerts("soon", nowSoon.map((a) => a.task.id));
      await tracker.releaseTaskAlerts("overdue", nowOverdue.map((a) => a.task.id));
      console.warn(`[bot] task alerts for group ${group.number} failed:`, error instanceof Error ? error.message : error);
    }
  }
  return alerted;
}

// ── Command menus ────────────────────────────────────────────────────────

const menu = (list: BotCommand[]): TgBotCommand[] => list.filter((c) => !c.hidden).map((c) => ({ command: c.name, description: c.description }));

/** The "/" menus Telegram should show, from COMMANDS: member commands in group chats, all commands in private chats. */
export const botMenus = () => ({
  group: menu(COMMANDS.filter((c) => !c.admin)),
  private: menu(COMMANDS),
});

/**
 * Sends the "/" menus to Telegram. Two calls cover every chat, so nothing needs updating when a chat
 * is connected or disconnected. Run from Set Webhook, and by ensureBotCommands.
 */
export async function syncBotCommands(api: Api = telegramApi()) {
  const menus = botMenus();
  await api.setMyCommands(menus.group, { scope: { type: "all_group_chats" } });
  await api.setMyCommands(menus.private, { scope: { type: "all_private_chats" } });
}

/**
 * Makes sure Telegram shows the current menus: asks what it has and syncs only when that differs from
 * COMMANDS, so a renamed command shows up after a deploy without anyone pressing Set Webhook. Returns
 * whether it had to sync. Without a bot token there is nothing to check.
 */
export async function ensureBotCommands(api: Api = telegramApi()) {
  if (!telegramToken()) return false;
  const menus = botMenus();
  const [group, direct] = await Promise.all([api.getMyCommands({ scope: { type: "all_group_chats" } }), api.getMyCommands({ scope: { type: "all_private_chats" } })]);
  const same = (have: TgBotCommand[], want: TgBotCommand[]) => JSON.stringify(have.map((c) => [c.command, c.description])) === JSON.stringify(want.map((c) => [c.command, c.description]));
  if (same(group, menus.group) && same(direct, menus.private)) return false;
  await syncBotCommands(api);
  return true;
}
