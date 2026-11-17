import type { InlineKeyboardButton } from "grammy/types";
import { CmsError, ensure } from "./actor";
import { groupFor, requireActor, type Ctx, type Reply } from "./bot-core";
import { shortDate, splitTitleAndDates } from "./bot-text";
import { escapeHtml as esc } from "./telegram";
import * as tracker from "./tracker";
import type { MilestoneDetail, ProjectGroup } from "./tracker";

/*
 * Button flows: a command sent without everything it needs lists the options as buttons, asks for
 * any typed answer (a title) as a reply, and ends with a Confirm button. Nothing is stored. Each
 * button's callback data carries the choices so far (group, item numbers, a status), and a typed
 * answer is read back from the message the Confirm button replies to. Every button ends with the
 * Telegram ID of the person who started the flow, so nobody else in a group chat can steer it.
 *
 * When everything is chosen, the flow runs the same command line the person could have typed
 * ("assign g1 5 Mia Lim"), so validation and replies stay in one place (bot.ts).
 */

export type FlowId = "at" | "et" | "ts" | "td" | "as" | "dt" | "ab" | "eb" | "rb" | "ub" | "db" | "ms" | "em" | "dn" | "sm" | "dm" | "rm";

/** What a flow asks for next: milestone, task, blocker, status, assignee, on/off. */
type Kind = "m" | "t" | "b" | "s" | "w" | "o";

interface FlowDef {
  /** The command that does the work once everything is chosen */
  cmd: string;
  title: string;
  admin?: boolean;
  pick: Kind[];
  /** A typed answer is needed: what to ask (continues "Name, …") and the reply box's hint */
  ask?: string;
  hint?: string;
  /** The command asks for its own confirmation (deletes) */
  own?: boolean;
  /** List only what is still open: tasks and milestones not done, blockers not resolved ("closed": resolved blockers) */
  only?: "active" | "closed";
}

export const FLOWS: Record<FlowId, FlowDef> = {
  at: { cmd: "addtask", title: "Add task", pick: ["m"], ask: "reply with the task title. Add “by 20 Nov” to set a due date.", hint: "Task title" },
  et: { cmd: "edittask", title: "Edit task", pick: ["t"], ask: "reply with the new title, a new due date (by 20 Nov), or both.", hint: "New title or by 20 Nov" },
  ts: { cmd: "taskstatus", title: "Set task status", pick: ["t", "s"] },
  td: { cmd: "taskdone", title: "Mark task done", pick: ["t"], only: "active" },
  as: { cmd: "assign", title: "Assign task", pick: ["t", "w"] },
  dt: { cmd: "deltask", title: "Delete task", pick: ["t"], own: true },
  ab: { cmd: "blocker", title: "Log blocker", pick: ["m"], ask: "reply with what is blocking the group.", hint: "What is blocking you" },
  eb: { cmd: "editblocker", title: "Edit blocker", pick: ["b"], ask: "reply with the new description.", hint: "New description" },
  rb: { cmd: "resolve", title: "Resolve blocker", pick: ["b"], only: "active" },
  ub: { cmd: "reopenblocker", title: "Reopen blocker", pick: ["b"], only: "closed" },
  db: { cmd: "delblocker", title: "Delete blocker", pick: ["b"], own: true },
  ms: { cmd: "milestone", title: "Add milestone", admin: true, pick: [], ask: "reply with the milestone: a title, then “from 1 Dec” (optional) and “by 15 Dec”.", hint: "Title by 15 Dec" },
  em: { cmd: "editmilestone", title: "Edit milestone", admin: true, pick: ["m"], ask: "reply with the new title, a new due date (by 15 Dec), or both.", hint: "New title or by 15 Dec" },
  dn: { cmd: "done", title: "Mark milestone done", admin: true, pick: ["m"], only: "active" },
  sm: { cmd: "status", title: "Set milestone status", admin: true, pick: ["m", "s"] },
  dm: { cmd: "delmilestone", title: "Delete milestone", admin: true, pick: ["m"], own: true },
  rm: { cmd: "reminders", title: "Reminders", admin: true, pick: ["o"] },
};

// ── State carried in the buttons ─────────────────────────────────────────

export interface FlowState {
  flow: FlowId;
  /** Project group number (always set once a group is known) */
  g?: number;
  /** A milestone opened only to browse its tasks or blockers; dropped once an item is picked */
  nav?: number;
  /** Item numbers and choices in order, e.g. ["5", "d"] */
  picks: string[];
  /** The typed answer is already in the command message the buttons reply to */
  typed: boolean;
}

const tokens = (s: FlowState) => [...(s.g !== undefined ? [`g${s.g}`] : []), ...(s.nav !== undefined ? [`m${s.nav}`] : []), ...s.picks, ...(s.typed ? ["x"] : [])];

/** Callback data: "f:ts:g1:5:d:<asker>" for a step, "ok:…" for Confirm. Well under Telegram's 64 bytes. */
export const flowData = (prefix: "f" | "ok", s: FlowState, from: number) => [prefix, s.flow, ...tokens(s), from].join(":");

export function parseFlowData(data: string): { prefix: "f" | "ok"; state: FlowState; from: number } | null {
  const [prefix, flow, ...rest] = data.split(":");
  if ((prefix !== "f" && prefix !== "ok") || !(flow in FLOWS) || !rest.length) return null;
  const from = Number(rest.pop());
  if (!Number.isSafeInteger(from)) return null;
  const state: FlowState = { flow: flow as FlowId, picks: [], typed: false };
  for (const t of rest) {
    if (/^g\d+$/.test(t)) state.g = Number(t.slice(1));
    else if (/^m\d+$/.test(t)) state.nav = Number(t.slice(1));
    else if (t === "x") state.typed = true;
    else state.picks.push(t);
  }
  return { prefix, state, from };
}

/** A prompt ends with its state as "ref f:at:g1:3:<asker>", so the reply can be matched with no stored data. */
export function parseRef(promptText: string | undefined) {
  const m = promptText?.match(/ref (f:[a-z]{2}(?::\w+)+)\s*$/);
  return m ? parseFlowData(m[1]) : null;
}

/** The typed answer behind a message: a command message gives what follows the command (and any g3); a reply is taken as it is. */
export function typedText(text: string | undefined) {
  const t = (text ?? "").trim();
  const m = t.match(/^\/\w+(?:@\w+)?\s*([\s\S]*)$/);
  return m ? m[1].replace(/^g\d+\b\s*/i, "").trim() : t;
}

// ── Steps ────────────────────────────────────────────────────────────────

export type Step =
  | { reply: Reply }
  /** Ask for a typed answer; `left` replaces the choice buttons' message */
  | { prompt: { reply: Reply; left: string } }
  /** Everything is chosen: run this command */
  | { run: { name: string; args: string } };

const STATUS = { t: "todo", i: "doing", d: "done" } as const;
const STATUS_LABEL = { t: "To do", i: "In progress", d: "Done" } as const;
const ICON = { todo: "⬜", in_progress: "⏳", done: "✅" } as const;
const CAP = 30;
const trunc = (s: string, n = 44) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const tag = (kind: "milestone" | "task" | "blocker", n: number) => `${tracker.LABEL[kind]}${n}`;
const num = (token: string, what: string) => {
  ensure(/^\d+$/.test(token), `That ${what} choice is not valid. Start again.`);
  return Number(token);
};

function buttons(c: Ctx, s: FlowState, question: string, options: [string, FlowState][], row = false, empty = "There is nothing to choose from."): Step {
  const def = FLOWS[s.flow];
  if (!options.length) return { reply: { text: `<b>${def.title}</b>\n${empty}` } };
  const shown = options.slice(0, CAP).map(([text, next]): InlineKeyboardButton => ({ text: trunc(text), callback_data: flowData("f", next, c.fromId) }));
  const more = options.length > CAP ? `\nShowing the first ${CAP} of ${options.length}. Use its number instead, for example /${def.cmd} 12.` : "";
  const rows = row ? [shown] : shown.map((b) => [b]);
  rows.push([{ text: "Cancel", callback_data: `n:${c.fromId}` }]);
  return { reply: { text: `<b>${def.title}</b>\n${question}${more}`, markup: { inline_keyboard: rows } } };
}

function find(timeline: MilestoneDetail[], kind: "milestone" | "task" | "blocker", n: number) {
  for (const m of timeline) {
    if (kind === "milestone" && m.number === n) return { m };
    for (const t of kind === "task" ? m.subtasks : []) if (t.number === n) return { m, t };
    for (const b of kind === "blocker" ? m.blockers : []) if (b.number === n) return { m, b };
  }
  throw new CmsError(`${kind[0].toUpperCase()}${kind.slice(1)} ${tag(kind, n)} not found`);
}

/**
 * The next screen of a flow: the next choice, the typed-answer prompt, the Confirm screen, or (for
 * deletes, which confirm themselves) the command to run. `text` is the typed answer when known.
 */
export async function flowScreen(c: Ctx, s0: FlowState, text?: string): Promise<Step> {
  const def = FLOWS[s0.flow];
  if (def.admin) requireActor(c);

  // Which group: this chat's, or an admin's choice in a private chat.
  if (s0.g === undefined && !c.group) {
    const actor = requireActor(c);
    const cohortId = await tracker.trackerCohortId();
    const groups = cohortId ? await tracker.listProjectGroups(actor, cohortId) : [];
    return buttons(c, s0, "Choose a project group.", groups.map((g): [string, FlowState] => [`Group ${g.number}${g.name ? ` · ${g.name}` : ""}`, { ...s0, g: g.number }]), false, "There are no project groups yet.");
  }
  const group = await groupFor(c, s0.g);
  const s: FlowState = { ...s0, g: group.number };
  const timeline = await tracker.getTimeline(c.scope, group.id);

  const kind = def.pick[s.picks.length];
  if (kind) return choose(c, s, kind, group, timeline);
  if (def.ask && text === undefined) {
    const subject = describe(s, group, timeline);
    const mention = `<a href="tg://user?id=${c.fromId}">${esc(c.name)}</a>`;
    return {
      prompt: {
        left: `<b>${def.title}</b>\n${subject}`,
        reply: { text: `${mention}, ${def.ask}\n<i>${subject}</i>\n<i>ref ${flowData("f", s, c.fromId)}</i>`, forceReply: def.hint },
      },
    };
  }
  const args = await commandArgs(c, s, group, text);
  if (def.own) return { run: { name: def.cmd, args } };
  return {
    reply: {
      text: `<b>${def.title}</b>\n${await summary(c, s, group, timeline, text)}`,
      markup: { inline_keyboard: [[{ text: "Confirm", callback_data: flowData("ok", s, c.fromId) }, { text: "Cancel", callback_data: `n:${c.fromId}` }]] },
    },
  };
}

/** The next thing to pick, as buttons. */
async function choose(c: Ctx, s: FlowState, kind: Kind, group: ProjectGroup, timeline: MilestoneDetail[]): Promise<Step> {
  const def = FLOWS[s.flow];
  const next = (pick: string): FlowState => ({ ...s, nav: undefined, picks: [...s.picks, pick] });
  const active = def.only === "active";

  if (kind === "m") {
    const list = timeline.filter((m) => !active || m.status !== "done");
    return buttons(c, s, "Choose a milestone.", list.map((m): [string, FlowState] => [`${tag("milestone", m.number)} ${m.title}`, next(String(m.number))]), false, active ? "Every milestone is done." : "There are no milestones yet.");
  }
  if (kind === "t" || kind === "b") {
    const items = (m: MilestoneDetail) =>
      kind === "t"
        ? m.subtasks.filter((t) => !active || t.status !== "done").map((t): [string, FlowState] => [`${ICON[t.status]} ${tag("task", t.number)} ${t.title}`, next(String(t.number))])
        : m.blockers
            .filter((b) => (def.only === "active" ? b.status === "open" : def.only === "closed" ? b.status === "resolved" : true))
            .map((b): [string, FlowState] => [`${b.status === "open" ? "🚧" : "✔️"} ${tag("blocker", b.number)} ${b.description}`, next(String(b.number))]);
    const word = kind === "t" ? "tasks" : "blockers";
    const withItems = timeline.filter((m) => items(m).length);
    if (!withItems.length) return { reply: { text: `<b>${def.title}</b>\nThere are no ${active || def.only ? "open " : ""}${word} to choose from.${kind === "t" ? " Add one with /addtask." : ""}` } };
    // One milestone has them all: skip straight to the list.
    const nav = s.nav ?? (withItems.length === 1 ? withItems[0].number : undefined);
    if (nav === undefined) {
      return buttons(c, s, `Choose the milestone the ${word.slice(0, -1)} is in.`, withItems.map((m): [string, FlowState] => [`${tag("milestone", m.number)} ${m.title} (${items(m).length})`, { ...s, nav: m.number }]));
    }
    return buttons(c, s, `Choose a ${word.slice(0, -1)} in ${tag("milestone", nav)}.`, items(find(timeline, "milestone", nav).m));
  }
  if (kind === "s") {
    return buttons(c, s, "Choose the new status.", (["t", "i", "d"] as const).map((k): [string, FlowState] => [STATUS_LABEL[k], next(k)]), true);
  }
  if (kind === "o") {
    return buttons(c, s, `Turn reminders for Group ${group.number} on or off?`, [["On", next("on")], ["Off", next("off")]], true);
  }
  // Assignee: the member list, the person asking, or nobody.
  const roster = await tracker.listMembers(c.scope, group.id);
  return buttons(c, s, "Choose who to assign it to.", [
    ...roster.map((m): [string, FlowState] => [m.name, next(String(m.id))]),
    [`Me (${c.name})`, next("me")],
    ["Unassigned", next("n")],
  ]);
}

/** What the flow is about, in a line. */
function describe(s: FlowState, group: ProjectGroup, timeline: MilestoneDetail[]) {
  const n = s.picks[0] === undefined ? 0 : Number(s.picks[0]);
  switch (s.flow) {
    case "at":
    case "ab":
    case "em":
      return `${tag("milestone", n)} ${esc(find(timeline, "milestone", n).m.title)}`;
    case "et":
      return `${tag("task", n)} ${esc(find(timeline, "task", n).t!.title)}`;
    case "eb":
      return `${tag("blocker", n)} ${esc(find(timeline, "blocker", n).b!.description)}`;
    default:
      return `Group ${group.number}${group.name ? ` (${esc(group.name)})` : ""}`;
  }
}

/** The typed answer, checked the way the command will check it, so a typo is caught before Confirm. */
function parseTyped(flow: FlowId, text: string, today: string) {
  if (flow === "ab" || flow === "eb") {
    ensure(text.trim(), "Type what is blocking the group.");
    return null;
  }
  const p = splitTitleAndDates(text, today, flow === "ms" || flow === "em");
  ensure(!p.badDue, `Couldn't read the date "${p.badDue}". Try 20 Nov or 2026-11-20.`);
  if (flow === "at") ensure(p.title, "Type the task title.");
  if (flow === "et" || flow === "em") ensure(p.title || p.dueOn, "Give a new title, a new due date (by 20 Nov), or both.");
  if (flow === "ms") {
    ensure(p.title, "Type the milestone title.");
    ensure(p.dueOn, "A milestone needs a due date: add “by 15 Dec”.");
  }
  return p;
}

/** The sentence above the Confirm button. */
async function summary(c: Ctx, s: FlowState, group: ProjectGroup, timeline: MilestoneDetail[], text?: string) {
  const def = FLOWS[s.flow];
  const n = s.picks[0] === undefined ? 0 : Number(s.picks[0]);
  const p = text !== undefined ? parseTyped(s.flow, text, c.today) : null;
  const due = (iso: string | null | undefined) => (iso ? `, due ${shortDate(iso, c.today)}` : "");
  const q = (x: string) => `“${esc(x)}”`;
  switch (s.flow) {
    case "at": {
      const m = find(timeline, "milestone", n).m;
      tracker.checkTaskDue(m, p!.dueOn); // caught here, before Confirm, not after
      return `Add task ${q(p!.title)}${due(p!.dueOn)} to ${tag("milestone", n)} ${q(m.title)}?`;
    }
    case "et": {
      const found = find(timeline, "task", n);
      const t = found.t!;
      tracker.checkTaskDue(found.m, p!.dueOn);
      return `Update ${tag("task", n)} ${q(t.title)}: ${[p!.title && `rename to ${q(p!.title)}`, p!.dueOn && `due ${shortDate(p!.dueOn, c.today)}`].filter(Boolean).join(", ")}?`;
    }
    case "ts":
    case "sm": {
      const status = STATUS_LABEL[s.picks[1] as keyof typeof STATUS_LABEL];
      ensure(status, "That status is not valid. Start again.");
      return s.flow === "ts"
        ? `Set ${tag("task", n)} ${q(find(timeline, "task", n).t!.title)} to ${status.toLowerCase()}?`
        : `Set ${tag("milestone", n)} ${q(find(timeline, "milestone", n).m.title)} to ${status.toLowerCase()}?`;
    }
    case "td":
      return `Mark ${tag("task", n)} ${q(find(timeline, "task", n).t!.title)} as done?`;
    case "as": {
      const t = find(timeline, "task", n).t!;
      return `${s.picks[1] === "n" ? "Unassign" : "Assign"} ${tag("task", n)} ${q(t.title)}${s.picks[1] === "n" ? "" : ` to ${esc(await assignee(c, group, s.picks[1]))}`}?`;
    }
    case "ab":
      return `Log a blocker on ${tag("milestone", n)} ${q(find(timeline, "milestone", n).m.title)}: ${q(text!.trim())}?`;
    case "eb":
      return `Change ${tag("blocker", n)} ${q(find(timeline, "blocker", n).b!.description)} to ${q(text!.trim())}?`;
    case "rb":
      return `Resolve ${tag("blocker", n)} ${q(find(timeline, "blocker", n).b!.description)}?`;
    case "ub":
      return `Reopen ${tag("blocker", n)} ${q(find(timeline, "blocker", n).b!.description)}?`;
    case "ms":
      return `Add milestone ${q(p!.title)}${p!.startsOn ? ` from ${shortDate(p!.startsOn, c.today)}` : ""}${due(p!.dueOn)} to Group ${group.number}?`;
    case "em": {
      const m = find(timeline, "milestone", n).m;
      return `Update ${tag("milestone", n)} ${q(m.title)}: ${[p!.title && `rename to ${q(p!.title)}`, p!.dueOn && `due ${shortDate(p!.dueOn, c.today)}`, p!.startsOn && `from ${shortDate(p!.startsOn, c.today)}`].filter(Boolean).join(", ")}?`;
    }
    case "dn":
      return `Mark ${tag("milestone", n)} ${q(find(timeline, "milestone", n).m.title)} as done?`;
    case "rm":
      return `Turn reminders ${s.picks[0] === "on" ? "on" : "off"} for Group ${group.number}?`;
    default:
      throw new CmsError(`${def.title} needs no confirmation here`);
  }
}

/** Who an assign choice means: "me", a member from the list, or a name. */
async function assignee(c: Ctx, group: ProjectGroup, pick: string) {
  if (pick === "me") return "me";
  if (pick === "n") return "none";
  const member = (await tracker.listMembers(c.scope, group.id)).find((m) => m.id === num(pick, "assignee"));
  ensure(member, "That member is no longer on the list. Start again.");
  return member.name;
}

const num0 = (s: FlowState) => String(num(s.picks[0] ?? "", "item"));

/** The command line the person could have typed: the project group, the item's number, then what to do. */
async function commandArgs(c: Ctx, s: FlowState, group: ProjectGroup, text?: string) {
  const g = `g${group.number}`;
  switch (s.flow) {
    case "ms":
      return `${g} ${text!.trim()}`;
    case "rm":
      return `${g} ${s.picks[0]}`;
    case "at":
    case "et":
    case "ab":
    case "eb":
    case "em":
      return `${g} ${num0(s)} ${text!.trim()}`;
    case "ts":
    case "sm":
      return `${g} ${num0(s)} ${STATUS[s.picks[1] as keyof typeof STATUS] ?? ""}`;
    case "as":
      return `${g} ${num0(s)} ${await assignee(c, group, s.picks[1])}`;
    default:
      return `${g} ${num0(s)}`;
  }
}

/** After Confirm: the command to run, from the same state and the typed answer. */
export async function flowCommand(c: Ctx, s: FlowState, text?: string) {
  const def = FLOWS[s.flow];
  if (def.admin) requireActor(c);
  const group = await groupFor(c, s.g);
  ensure(s.picks.length === def.pick.length, "That choice is incomplete. Start again.");
  if (def.ask) {
    ensure(text, "I can no longer see your message. Start again.");
    parseTyped(s.flow, text, c.today);
  }
  return { name: def.cmd, args: await commandArgs(c, { ...s, g: group.number }, group, text) };
}
