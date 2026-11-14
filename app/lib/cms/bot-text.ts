import type { BlockerRow, ProjectGroupRow, ProjectMemberRow } from "@/app/lib/db/schema";
import { meetingDeadline, type MilestoneDetail } from "./tracker";
import { escapeHtml as esc } from "./telegram";

/** Parsing and formatting for the tracker bot's messages. Pure: no database, no network. */

export interface ParsedCommand {
  cmd: string;
  args: string;
  /** "/task@OtherBot": addressed to a different bot, which must not answer */
  forOtherBot: boolean;
}

/** "/task@SmubiaBot 12 Draft deck" → { cmd: "task", args: "12 Draft deck" }; null when the text is not a command. */
export function parseCommand(text: string, botName = ""): ParsedCommand | null {
  const m = text.match(/^\/([A-Za-z_]+)(?:@(\w+))?(?:\s+([\s\S]*))?$/);
  if (!m) return null;
  return {
    cmd: m[1].toLowerCase(),
    args: (m[3] ?? "").trim(),
    forOtherBot: Boolean(m[2] && botName && m[2].toLowerCase() !== botName.toLowerCase()),
  };
}

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

const STATUS_ICON = { todo: "⬜", in_progress: "⏳", done: "✅" } as const;
const STATUS_LABEL = { todo: "To do", in_progress: "In progress", done: "Done" } as const;

/** The words people type for a status: todo, doing, done. */
export function parseStatus(word: string): "todo" | "in_progress" | "done" | null {
  const w = word.trim().toLowerCase();
  if (w === "todo" || w === "to-do" || w === "open") return "todo";
  if (w === "doing" || w === "wip" || w === "in_progress" || w === "progress") return "in_progress";
  if (w === "done" || w === "complete" || w === "completed") return "done";
  return null;
}

// ── Messages (Telegram HTML) ─────────────────────────────────────────────

const MAX = 3900; // Telegram's limit is 4096 characters
const cap = (lines: string[]) => {
  const text = lines.join("\n");
  return text.length <= MAX ? text : `${text.slice(0, MAX)}\n…`;
};

export function formatTimeline(group: ProjectGroupRow, milestones: MilestoneDetail[], today: string) {
  const met = group.lastMeetingAt ? `last met ${shortDate(sgtDay(group.lastMeetingAt), today)}` : "no meeting logged";
  const lines = [
    `<b>Group ${group.number}${group.name ? ` · ${esc(group.name)}` : ""}</b>`,
    `Mentor meeting: ${met}, next by ${shortDate(sgtDay(meetingDeadline(group)), today)}`,
    "",
  ];
  if (!milestones.length) lines.push("No milestones yet.");
  for (const m of milestones) {
    const done = m.subtasks.filter((s) => s.status === "done").length;
    const open = m.blockers.filter((b) => b.status === "open").length;
    const overdue = m.status !== "done" && m.dueOn < today ? " · overdue" : "";
    lines.push(
      `${STATUS_ICON[m.status]} <b>#${m.id}</b> ${esc(m.title)} — due ${shortDate(m.dueOn, today)}${overdue}` +
        (m.subtasks.length ? ` · ${done}/${m.subtasks.length} tasks` : "") +
        (open ? ` · 🚧 ${open}` : "")
    );
  }
  return cap(lines);
}

export function formatMilestone(m: MilestoneDetail, members: ProjectMemberRow[], today: string) {
  const name = (id: number | null) => members.find((x) => x.id === id)?.name;
  const lines = [
    `<b>#${m.id} ${esc(m.title)}</b> — ${STATUS_ICON[m.status]} ${STATUS_LABEL[m.status]}`,
    `Due ${shortDate(m.dueOn, today)}${m.startsOn ? ` (from ${shortDate(m.startsOn, today)})` : ""}`,
  ];
  if (m.notes) lines.push(esc(m.notes));
  lines.push("", "<b>Tasks</b>");
  if (!m.subtasks.length) lines.push("None. Add one: /task " + m.id + " title");
  for (const s of m.subtasks) {
    lines.push(
      `${STATUS_ICON[s.status]} <b>#${s.id}</b> ${esc(s.title)}` +
        (s.dueOn ? ` — due ${shortDate(s.dueOn, today)}` : "") +
        (name(s.assigneeId) ? ` — ${esc(name(s.assigneeId)!)}` : "")
    );
  }
  lines.push("", "<b>Blockers</b>");
  if (!m.blockers.length) lines.push("None");
  for (const b of m.blockers) lines.push(blockerLine(b));
  return cap(lines);
}

const blockerLine = (b: BlockerRow) => `${b.status === "open" ? "🚧" : "✔️"} <b>#${b.id}</b> ${esc(b.description)}${b.status === "resolved" ? " (resolved)" : ""}`;

export function formatGroups(groups: ProjectGroupRow[], today: string) {
  if (!groups.length) return "No groups yet. Add them on the dashboard.";
  return cap([
    "<b>Project groups</b>",
    ...groups.map((g) => {
      const met = g.lastMeetingAt ? shortDate(sgtDay(g.lastMeetingAt), today) : "never";
      return `<b>${g.number}</b> ${esc(g.name || "—")} · chat ${g.telegramChatId ? "✅" : "❌"} · met ${met} · reminders ${g.meetingRemindersOn ? "on" : "off"}`;
    }),
  ]);
}

/** The 3-week nudge sent to a group's chat. */
export function formatMeetingReminder(group: ProjectGroupRow, today: string) {
  const since = group.lastMeetingAt ? `Your last meeting with your mentor${group.mentors ? "s" : ""} was on ${shortDate(sgtDay(group.lastMeetingAt), today)}.` : "No meeting with your mentors has been logged yet.";
  return [
    `⏰ <b>Group ${group.number}${group.name ? ` · ${esc(group.name)}` : ""}</b>`,
    since,
    `Please meet ${group.mentors ? esc(group.mentors) : "your mentors"} by <b>${shortDate(sgtDay(meetingDeadline(group)), today)}</b>, then log it with /meeting.`,
  ].join("\n");
}
