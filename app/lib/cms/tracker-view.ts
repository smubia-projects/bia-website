import { sgtDay } from "./bot-text";
import { meetingDeadline, type MilestoneDetail, type ProjectGroup } from "./tracker";

/** Geometry and totals for the dashboard's timeline. Pure: the page only draws what this returns. */

export interface GroupTimeline {
  group: ProjectGroup;
  milestones: MilestoneDetail[];
}

export interface ChartBar {
  id: number;
  title: string;
  status: MilestoneDetail["status"];
  startPct: number;
  endPct: number;
  /** No start date: drawn as a marker on the due date */
  point: boolean;
  row: number;
  overdue: boolean;
  openBlockers: number;
  tasksDone: number;
  tasks: number;
  dueOn: string;
  startsOn: string | null;
}

export interface ChartLane {
  group: ProjectGroup;
  rows: number;
  bars: ChartBar[];
}

export interface Chart {
  start: string;
  end: string;
  days: number;
  ticks: { pct: number; label: string }[];
  todayPct: number;
  lanes: ChartLane[];
}

const DAY = 86_400_000;
const num = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / DAY;
const iso = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const tickLabel = (n: number) => {
  const d = new Date(n * DAY);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};

/** A marker's label needs room to its right, in percent of the track. */
const LABEL_ROOM = 16;

/** Null when no group has a milestone yet. `today` is YYYY-MM-DD in Singapore. */
export function buildChart(data: GroupTimeline[], today: string): Chart | null {
  const all = data.flatMap((d) => d.milestones);
  if (!all.length) return null;

  const first = Math.min(num(today), ...all.map((m) => num(m.startsOn ?? m.dueOn)));
  const last = Math.max(num(today), ...all.map((m) => num(m.dueOn)));
  // Start on the Monday on or before the first date (1970-01-01 was a Thursday), with a week of margin at the end.
  const startN = first - ((first - 4) % 7 + 7) % 7;
  const endN = Math.max(last + 7, startN + 28);
  const days = endN - startN;
  const pct = (n: number) => ((n - startN) / days) * 100;

  const weeks = Math.ceil(days / 7);
  const step = Math.max(1, Math.ceil(weeks / 12));
  const ticks: Chart["ticks"] = [];
  for (let w = 0; w <= weeks; w += step) ticks.push({ pct: pct(startN + w * 7), label: tickLabel(startN + w * 7) });

  const lanes = data.map(({ group, milestones }): ChartLane => {
    const rowEnds: number[] = [];
    const bars = milestones.map((m): ChartBar => {
      const point = !m.startsOn;
      const s = pct(num(m.startsOn ?? m.dueOn));
      const e = pct(num(m.dueOn));
      // A marker has no width, so give it a sliver; only its label decides how much room it takes.
      const startPct = point ? Math.max(0, e - 0.6) : s;
      const endPct = point ? e + 0.6 : Math.max(e, s + 1.2);
      const occupied = point ? e + LABEL_ROOM : endPct;
      let row = rowEnds.findIndex((end) => end <= startPct);
      if (row === -1) row = rowEnds.length;
      rowEnds[row] = occupied + 0.5;
      return {
        id: m.id,
        title: m.title,
        status: m.status,
        startPct,
        endPct,
        point,
        row,
        overdue: m.status !== "done" && m.dueOn < today,
        openBlockers: m.blockers.filter((b) => b.status === "open").length,
        tasksDone: m.subtasks.filter((s2) => s2.status === "done").length,
        tasks: m.subtasks.length,
        dueOn: m.dueOn,
        startsOn: m.startsOn,
      };
    });
    return { group, rows: Math.max(1, rowEnds.length), bars };
  });

  return { start: iso(startN), end: iso(endN), days, ticks, todayPct: pct(num(today)), lanes };
}

export interface Summary {
  groups: number;
  chatsRegistered: number;
  milestones: number;
  milestonesDone: number;
  overdue: number;
  openBlockers: number;
  /** Groups whose next meeting date has passed */
  meetingsOverdue: number;
}

export function summarise(data: GroupTimeline[], today: string, now = new Date()): Summary {
  const ms = data.flatMap((d) => d.milestones);
  return {
    groups: data.length,
    chatsRegistered: data.filter((d) => d.group.telegramChatId != null).length,
    milestones: ms.length,
    milestonesDone: ms.filter((m) => m.status === "done").length,
    overdue: ms.filter((m) => m.status !== "done" && m.dueOn < today).length,
    openBlockers: ms.reduce((n, m) => n + m.blockers.filter((b) => b.status === "open").length, 0),
    meetingsOverdue: data.filter((d) => meetingDeadline(d.group).getTime() < now.getTime()).length,
  };
}

/** The date the next meeting is due by, as a Singapore calendar day. */
export const nextMeetingBy = (g: ProjectGroup) => sgtDay(meetingDeadline(g));
