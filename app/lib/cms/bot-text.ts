import type { BlockerRow, ProjectGroupRow, ProjectMemberRow } from "@/app/lib/db/schema";
import { meetingDeadline, type MilestoneDetail } from "./tracker";
import { escapeHtml as esc } from "./telegram";

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
 * Without a year it uses the current one, or (for meetings, `past`) the last one that is not in the future.
 * `today` is Singapore's date as YYYY-MM-DD. Returns null when it is not a real date.
 */
export function parseDate(text: string, today: string, past = false): string | null {
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

  const thisYear = +today.slice(0, 4);
  const iso = isoDate(year ?? thisYear, month, day);
  if (iso && year === undefined && past && iso > today) return isoDate(thisYear - 1, month, day);
  return iso;
}

export interface TitleAndDates {
  title: string;
  startsOn: string | null;
  dueOn: string | null;
  /** The text after "by" when it was not a date, so required-date commands can say so */
  badDue: string | null;
}

/** "Prototype from 1 Dec by 15 Dec" → title, start and due. A "by …" that is not a date stays part of the title. */
export function splitTitleAndDates(args: string, today: string): TitleAndDates {
  let title = args.trim();
  let dueOn: string | null = null;
  let startsOn: string | null = null;
  let badDue: string | null = null;
  const by = title.match(/^([\s\S]*?)\s+by\s+(\S+(?:\s+\S+){0,2})$/i);
  if (by) {
    const d = parseDate(by[2], today);
    if (d) [title, dueOn] = [by[1].trim(), d];
    else badDue = by[2];
  }
  const from = title.match(/^([\s\S]*?)\s+from\s+(\S+(?:\s+\S+){0,2})$/i);
  if (from) {
    const d = parseDate(from[2], today);
    if (d) [title, startsOn] = [from[1].trim(), d];
  }
  return { title, startsOn, dueOn, badDue };
}

/** A calendar day as a moment: noon Singapore time, so date-only meeting logs land on that day everywhere. */
export const noonSgt = (iso: string) => new Date(`${iso}T12:00:00+08:00`);

/** "20 Nov", with the year when it is not the current one. */
export function shortDate(iso: string, today: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1][0].toUpperCase()}${MONTHS[m - 1].slice(1)}${String(y) !== today.slice(0, 4) ? ` ${y}` : ""}`;
}

/** A timestamp as a Singapore calendar date. */
export const sgtDay = (when: string | Date) => new Date(new Date(when).getTime() + 8 * 3_600_000).toISOString().slice(0, 10);

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
            `<tg-button type="callback_data" style="link" data="m:${m.id}">${m.id}</tg-button>`,
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

/** A milestone's tasks and blockers. */
export function formatMilestone(m: MilestoneDetail, members: ProjectMemberRow[], today: string) {
  const assignee = (s: MilestoneDetail["subtasks"][number]) => {
    const member = members.find((x) => x.id === s.assigneeId)?.name;
    if (member) return esc(member);
    return s.assigneeName ? `${esc(s.assigneeName)} <i>(not on the member list)</i>` : "Unassigned";
  };
  const overdue = m.status !== "done" && m.dueOn < today;
  const dates = `${m.startsOn ? `From ${shortDate(m.startsOn, today)} to` : "Due"} ${shortDate(m.dueOn, today)}`;
  const parts = [
    `<h3>Milestone ${m.id}: ${esc(m.title)}</h3>`,
    `<p>${STATUS_LABEL[m.status]}. ${dates}${overdue ? ", <b>overdue</b>" : ""}.</p>`,
  ];
  if (m.notes) parts.push(`<blockquote>${esc(m.notes)}</blockquote>`);

  parts.push("<h4>Tasks</h4>");
  if (!m.subtasks.length) parts.push(`<p>None yet. Add one with /task ${m.id} and a title.</p>`);
  else {
    parts.push(
      table(
        ["#", "Task", "Status", "Due", "Assignee"],
        m.subtasks.slice(0, ROWS).map((s) => [String(s.id), esc(s.title), STATUS_LABEL[s.status], s.dueOn ? shortDate(s.dueOn, today) : "None", assignee(s)])
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

const blockerList = (list: BlockerRow[]) => `<ul>${list.map((b) => `<li>#${b.id} ${esc(b.description)}</li>`).join("")}</ul>`;

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
