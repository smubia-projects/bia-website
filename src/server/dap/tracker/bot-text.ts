import "server-only";
import type { BlockerRow, ProjectGroupRow, ProjectMemberRow } from "@/server/db/schema";
import { sgtDay, shortDate } from "@/shared/time";
import { LABEL, meetingDeadline, type MilestoneDetail, type TaskAlert } from "./service";
import { escapeHtml as esc } from "@/server/integrations/telegram/client";

/** Parsing and formatting for the tracker bot's messages. Pure: no database, no network. */

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function isoDate(y: number, m: number, d: number) {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const iso = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) === iso ? iso : null;
}

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/**
 * Reads "2026-11-20", "20 Nov", "Nov 20 2026", "20/11", "today", "tomorrow", "yesterday".
 * Without a year: the next such day from today (a due date), or with `past` the last one up to
 * today (a meeting), or with `onOrBefore` the last one up to that date (a start before its due date).
 * `today` is Singapore's date as YYYY-MM-DD. Returns null when it is not a real date.
 */
export function parseDate(text: string, today: string, past = false, onOrBefore?: string): string | null {
  const t = text.trim().toLowerCase().replace(/,/g, "");
  if (t === "today") return today;
  if (t === "tomorrow") return addDays(today, 1);
  if (t === "yesterday") return addDays(today, -1);
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return isoDate(+m[1], +m[2], +m[3]);

  let day: number, month: number, year: number | undefined;
  if ((m = t.match(/^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{4}))?$/))) [day, month, year] = [+m[1], +m[2], m[3] ? +m[3] : undefined];
  else if ((m = t.match(/^(\d{1,2})\s+([a-z]{3,9})(?:\s+(\d{4}))?$/)) && MONTHS.includes(m[2].slice(0, 3)))
    [day, month, year] = [+m[1], MONTHS.indexOf(m[2].slice(0, 3)) + 1, m[3] ? +m[3] : undefined];
  else if ((m = t.match(/^([a-z]{3,9})\s+(\d{1,2})(?:\s+(\d{4}))?$/)) && MONTHS.includes(m[1].slice(0, 3)))
    [day, month, year] = [+m[2], MONTHS.indexOf(m[1].slice(0, 3)) + 1, m[3] ? +m[3] : undefined];
  else return null;

  if (year !== undefined) return isoDate(year, month, day);
  const limit = onOrBefore ?? (past ? today : null);
  if (limit) {
    const y = +limit.slice(0, 4);
    const iso = isoDate(y, month, day);
    return iso && iso > limit ? isoDate(y - 1, month, day) : iso;
  }
  // "by 5 Jan" in November means next January, not a date that has already passed.
  const y = +today.slice(0, 4);
  const iso = isoDate(y, month, day);
  return iso && iso < today ? isoDate(y + 1, month, day) : iso;
}

/** Whether the words after "by" were meant as a date: a number, or today, tomorrow or yesterday. */
const looksLikeDate = (text: string) => /\d/.test(text) || /^(today|tomorrow|yesterday)$/i.test(text.trim());

export interface TitleAndDates {
  title: string;
  startsOn: string | null;
  dueOn: string | null;
  /** The text after "by" when it looks like a date but is not a real one ("31 Nov"), so commands can say so */
  badDue: string | null;
}

/**
 * "Prototype from 1 Dec by 15 Dec" → title, start and due. A "by …" that is not a date stays part of the
 * title ("Presentation by the team"). Only milestones have a start date, so "from …" is read only with
 * `withStart`; a task keeps it in its title.
 */
export function splitTitleAndDates(args: string, today: string, withStart = false): TitleAndDates {
  let title = args.trim();
  let dueOn: string | null = null;
  let startsOn: string | null = null;
  let badDue: string | null = null;
  // "by …" may also be the whole text: /edittask 5 by 22 Nov changes only the due date.
  const by = title.match(/^(?:([\s\S]*?)\s+)?by\s+(\S+(?:\s+\S+){0,2})$/i);
  if (by) {
    const d = parseDate(by[2], today);
    if (d) [title, dueOn] = [(by[1] ?? "").trim(), d];
    else if (looksLikeDate(by[2])) badDue = by[2];
  }
  const from = withStart ? title.match(/^(?:([\s\S]*?)\s+)?from\s+(\S+(?:\s+\S+){0,2})$/i) : null;
  if (from) {
    // A start without a year is the last such day on or before the due date.
    const d = parseDate(from[2], today, false, dueOn ?? undefined);
    if (d) [title, startsOn] = [(from[1] ?? "").trim(), d];
  }
  return { title, startsOn, dueOn, badDue };
}

const STATUS_LABEL = { todo: "To do", in_progress: "In progress", done: "Done" } as const;

/** The words people type for a status: todo, doing, done. */
export function parseStatus(word: string): "todo" | "in_progress" | "done" | null {
  const w = word.trim().toLowerCase();
  if (w === "todo" || w === "to-do" || w === "open") return "todo";
  if (w === "doing" || w === "wip" || w === "in_progress" || w === "progress") return "in_progress";
  if (w === "done" || w === "complete" || w === "completed") return "done";
  return null;
}

// ── Messages (Telegram rich messages) ────────────────────────────────────
//
// Views that list several things are rich messages (headings, tables, lists), so each value
// has its own column or line instead of being strung together with dots. One-line
// confirmations stay ordinary messages and are written in bot.ts.

/** Rows per table, which keeps a message well under Telegram's 32,768 characters. */
const ROWS = 60;
const more = (n: number) => (n > ROWS ? `<p>Showing the first ${ROWS} of ${n}. The dashboard has the rest.</p>` : "");

const groupTitle = (g: ProjectGroupRow) => `Group ${g.number}${g.name ? ` (${esc(g.name)})` : ""}`;
export const table = (head: string[], rows: string[][]) =>
  `<table bordered striped compact><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("")}</table>`;

function meetingLine(group: ProjectGroupRow, today: string) {
  const next = shortDate(sgtDay(meetingDeadline(group)), today);
  return group.lastMeetingAt
    ? `<p>Last mentor meeting ${shortDate(sgtDay(group.lastMeetingAt), today)}. Next meeting by ${next}.</p>`
    : `<p>No mentor meeting logged yet. Next meeting by ${next}.</p>`;
}

/** /milestones: the group's timeline as a table, one row per milestone. */
export function formatTimeline(group: ProjectGroupRow, milestones: MilestoneDetail[], today: string) {
  const parts = [`<h3>${groupTitle(group)}</h3>`, meetingLine(group, today)];
  if (!milestones.length) parts.push("<p>No milestones yet.</p>");
  else {
    parts.push(
      table(
        ["#", "Milestone", "Due", "Status", "Tasks", "Open Blockers"],
        milestones.slice(0, ROWS).map((m) => {
          const overdue = m.status !== "done" && m.dueOn < today;
          const done = m.subtasks.filter((s) => s.status === "done").length;
          const open = m.blockers.filter((b) => b.status === "open").length;
          return [
            `<tg-button type="callback_data" style="link" data="m:${m.id}">${LABEL.milestone}${m.number}</tg-button>`,
            esc(m.title),
            overdue ? `<b>${shortDate(m.dueOn, today)}, overdue</b>` : shortDate(m.dueOn, today),
            STATUS_LABEL[m.status],
            m.subtasks.length ? `${done} of ${m.subtasks.length} done` : "None",
            open ? String(open) : "None",
          ];
        })
      ),
      more(milestones.length),
      "<footer>Tap a milestone's number to see its tasks and blockers.</footer>"
    );
  }
  return parts.join("");
}

const assigneeOf = (s: MilestoneDetail["subtasks"][number], members: ProjectMemberRow[]) => {
  const member = members.find((x) => x.id === s.assigneeId)?.name;
  if (member) return esc(member);
  return s.assigneeName ? `${esc(s.assigneeName)} <i>(not on the member list)</i>` : "Unassigned";
};

/** /listtask: every task of the group (or of one milestone), a table per milestone. */
export function formatTasks(group: ProjectGroupRow, milestones: MilestoneDetail[], members: ProjectMemberRow[], today: string, only?: number) {
  const parts = [`<h3>Tasks: ${groupTitle(group)}</h3>`];
  const shown = milestones.filter((m) => m.subtasks.length && (only === undefined || m.number === only));
  if (!shown.length) {
    parts.push(`<p>No tasks yet. Add one with /addtask.</p>`);
    return parts.join("");
  }
  let rows = 0;
  for (const m of shown) {
    if (rows >= ROWS) break;
    const list = m.subtasks.slice(0, ROWS - rows);
    rows += list.length;
    parts.push(
      `<h4>${LABEL.milestone}${m.number}: ${esc(m.title)}</h4>`,
      table(["#", "Task", "Status", "Due", "Assignee"], list.map((s) => [`${LABEL.task}${s.number}`, esc(s.title), STATUS_LABEL[s.status], s.dueOn ? shortDate(s.dueOn, today) : "None", assigneeOf(s, members)]))
    );
  }
  const total = shown.reduce((n, m) => n + m.subtasks.length, 0);
  parts.push(more(total), "<footer>Change a task with /edittask, /taskstatus or /assign; add one with /addtask.</footer>");
  return parts.join("");
}

/** A milestone's tasks and blockers. */
export function formatMilestone(m: MilestoneDetail, members: ProjectMemberRow[], today: string) {
  const assignee = (s: MilestoneDetail["subtasks"][number]) => assigneeOf(s, members);
  const overdue = m.status !== "done" && m.dueOn < today;
  const dates = `${m.startsOn ? `From ${shortDate(m.startsOn, today)} to` : "Due"} ${shortDate(m.dueOn, today)}`;
  const parts = [
    `<h3>Milestone ${LABEL.milestone}${m.number}: ${esc(m.title)}</h3>`,
    `<p>${STATUS_LABEL[m.status]}. ${dates}${overdue ? ", <b>overdue</b>" : ""}.</p>`,
  ];
  if (m.notes) parts.push(`<blockquote>${esc(m.notes)}</blockquote>`);

  parts.push("<h4>Tasks</h4>");
  if (!m.subtasks.length) parts.push(`<p>None yet. Add one with /addtask ${m.number} and a title.</p>`);
  else {
    parts.push(
      table(
        ["#", "Task", "Status", "Due", "Assignee"],
        m.subtasks.slice(0, ROWS).map((s) => [`${LABEL.task}${s.number}`, esc(s.title), STATUS_LABEL[s.status], s.dueOn ? shortDate(s.dueOn, today) : "None", assignee(s)])
      ),
      more(m.subtasks.length)
    );
  }

  const open = m.blockers.filter((b) => b.status === "open");
  const resolved = m.blockers.filter((b) => b.status === "resolved");
  parts.push("<h4>Open Blockers</h4>", open.length ? blockerList(open) : "<p>None.</p>");
  if (resolved.length) parts.push(`<details><summary>Resolved Blockers (${resolved.length})</summary>${blockerList(resolved)}</details>`);
  return parts.join("");
}

const blockerList = (list: BlockerRow[]) => `<ul>${list.map((b) => `<li>${LABEL.blocker}${b.number} ${esc(b.description)}</li>`).join("")}</ul>`;

/** /groups (private chat): every project group of the cohort. */
export function formatGroups(groups: ProjectGroupRow[], today: string) {
  if (!groups.length) return "<p>No project groups yet. Add them on the dashboard.</p>";
  return (
    `<h3>Project Groups</h3>${table(
      ["Group", "Name", "Chat", "Last Meeting", "Reminders"],
      groups.slice(0, ROWS).map((g) => [
        String(g.number),
        esc(g.name) || "None",
        g.telegramChatId ? "Connected" : "Not connected",
        g.lastMeetingAt ? shortDate(sgtDay(g.lastMeetingAt), today) : "None logged",
        g.meetingRemindersOn ? "On" : "Off",
      ])
    )}${more(groups.length)}`
  );
}

/** "20 Nov, in 3 days" / "20 Nov, yesterday": a due date and how far it is from today. */
function dueIn(iso: string, today: string) {
  const d = Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  const date = shortDate(iso, today);
  if (d === 0) return `${date}, today`;
  if (d === 1) return `${date}, tomorrow`;
  if (d === -1) return `${date}, yesterday`;
  return d > 0 ? `${date}, in ${d} days` : `${date}, ${-d} days ago`;
}

/** The task deadline alert sent to a group's chat: overdue tasks first, then those due within a week. */
export function formatTaskDeadlines(group: ProjectGroupRow, soon: TaskAlert[], overdue: TaskAlert[], members: ProjectMemberRow[], today: string) {
  const rows = (list: TaskAlert[]) =>
    table(
      ["#", "Task", "Milestone", "Due", "Assignee"],
      list.slice(0, ROWS).map(({ task, milestone }) => [`${LABEL.task}${task.number}`, esc(task.title), `${LABEL.milestone}${milestone.number}: ${esc(milestone.title)}`, dueIn(task.dueOn!, today), assigneeOf(task, members)])
    ) + more(list.length);
  const parts = [`<h3>Task Deadlines: ${groupTitle(group)}</h3>`];
  if (overdue.length) parts.push("<h4>Overdue</h4>", rows(overdue));
  if (soon.length) parts.push("<h4>Due Within a Week</h4>", rows(soon));
  parts.push("<footer>Mark a task done with /taskdone, or change its deadline with /edittask.</footer>");
  return parts.join("");
}

/** The 3-week nudge sent to a group's chat. */
export function formatMeetingReminder(group: ProjectGroupRow, today: string) {
  const since = group.lastMeetingAt
    ? `Your last meeting with your mentor${group.mentors ? "s" : ""} was on ${shortDate(sgtDay(group.lastMeetingAt), today)}.`
    : "No meeting with your mentors has been logged yet.";
  return [
    `<h3>Mentor Meeting Due: ${groupTitle(group)}</h3>`,
    `<p>${since} Please meet ${group.mentors ? esc(group.mentors) : "your mentors"} by <b>${shortDate(sgtDay(meetingDeadline(group)), today)}</b>, then log it with /meeting.</p>`,
  ].join("");
}
