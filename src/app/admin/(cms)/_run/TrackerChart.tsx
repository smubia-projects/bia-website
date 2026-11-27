import Link from "next/link";
import { shortDate } from "@/shared/time";
import type { Chart, ChartBar } from "@/server/dap/tracker/view";
import { runHref } from "@/app/admin/_components/runs";
import ScrollToToday from "./ScrollToToday";
import t from "@/app/admin/tracker.module.css";

const STATUS = { todo: "To do", in_progress: "In progress", done: "Done" } as const;
const ROW = 30;

function label(b: ChartBar, today: string) {
  const span = b.startsOn ? `${shortDate(b.startsOn, today)} to ${shortDate(b.dueOn, today)}` : `due ${shortDate(b.dueOn, today)}`;
  return [
    `${b.title}, ${span}, ${STATUS[b.status]}`,
    b.tasks ? `${b.tasksDone} of ${b.tasks} tasks done` : "",
    b.openBlockers ? `${b.openBlockers} open blocker${b.openBlockers > 1 ? "s" : ""}` : "",
    b.overdue ? "overdue" : "",
  ]
    .filter(Boolean)
    .join(", ");
}

/** Swimlane timeline: one lane per project group, bars from start to due date. Pure markup, no client code. */
export default function TrackerChart({ chart, slug, today }: { chart: Chart; slug: string; today: string }) {
  const trackWidth = Math.max(640, (chart.days / 7) * 72);
  return (
    <ScrollToToday className={t.chartScroll} todayPct={chart.todayPct}>
      <div className={t.chart} style={{ minWidth: 168 + trackWidth }}>
        <div className={t.axis} aria-hidden="true">
          <div />
          <div className={t.axisTrack}>
            {chart.ticks.map((tick) => (
              <span key={tick.pct} className={t.tick} style={{ left: `${tick.pct}%` }}>
                {tick.label}
              </span>
            ))}
          </div>
        </div>
        {chart.lanes.map((lane) => {
          const href = runHref("DAP", slug, `project-groups/${lane.group.id}`);
          return (
            <div key={lane.group.id} className={t.lane}>
              <Link href={href} className={t.laneLabel}>
                Group {lane.group.number}
                <span className={t.laneMeta}>{lane.group.name || "Unnamed"}</span>
              </Link>
              <div className={t.track} style={{ height: lane.rows * ROW + 12 }}>
                {chart.ticks.map((tick) => (
                  <span key={tick.pct} className={t.grid} style={{ left: `${tick.pct}%` }} aria-hidden="true" />
                ))}
                <span className={t.today} style={{ left: `${chart.todayPct}%` }} aria-hidden="true" />
                {lane.bars.map((b) => {
                  const state = `${t[`s_${b.status}`]} ${b.overdue ? t.overdue : ""} ${b.openBlockers ? t.blocked : ""}`;
                  const top = 6 + b.row * ROW;
                  return b.point ? (
                    <Link key={b.id} href={href} className={`${t.point} ${state}`} style={{ left: `${(b.startPct + b.endPct) / 2}%`, top }} aria-label={label(b, today)} title={label(b, today)}>
                      <span className={t.diamond} />
                      {b.title}
                      {b.openBlockers > 0 && <span className={t.pointBlock} />}
                    </Link>
                  ) : (
                    <Link key={b.id} href={href} className={`${t.bar} ${state}`} style={{ left: `${b.startPct}%`, width: `${b.endPct - b.startPct}%`, top }} aria-label={label(b, today)} title={label(b, today)}>
                      {b.tasks > 0 && b.status !== "done" && <span className={t.fill} style={{ width: `${(b.tasksDone / b.tasks) * 100}%` }} />}
                      <span className={t.barText}>{b.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollToToday>
  );
}
