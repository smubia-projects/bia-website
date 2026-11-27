import Link from "next/link";
import { shortDate, sgtDay } from "@/server/dap/tracker/bot-text";
import { todaySgt } from "@/server/people/people";
import { getAllTimelines } from "@/server/dap/tracker/service";
import { buildChart, nextMeetingBy, summarise } from "@/server/dap/tracker/view";
import AddGroupButton from "../../../_run/AddGroupButton";
import TrackerChart from "../../../_run/TrackerChart";
import { loadRun } from "../../../_run/load";
import { PageHead } from "../../../../_components/ui";
import { runHref } from "../../../../_components/runs";
import styles from "../../../../cms.module.css";
import t from "../../../../tracker.module.css";

export default async function TrackerPage(props: { params: Promise<{ run: string }> }) {
  const params = await props.params;
  const { actor, cohort } = await loadRun("DAP", params.run);
  const data = await getAllTimelines(actor, cohort.id);
  const today = todaySgt();
  const now = new Date();
  const chart = buildChart(data, today);
  const sum = summarise(data, today, now);
  const nextNumber = Math.max(0, ...data.map((d) => d.group.number)) + 1;

  // Figures that need action turn red when above zero; the others are progress.
  const stat = (label: string, value: number, of?: number, alert?: boolean) => (
    <div className={`${t.stat} ${alert && value > 0 ? t.statWarn : ""}`}>
      <span className={t.statLabel}>{label}</span>
      <span className={`${t.statValue} ${alert && value > 0 ? t.statAlert : ""}`}>
        {value}
        {of !== undefined && <small>/{of}</small>}
      </span>
    </div>
  );

  return (
    <div className={styles.stack}>
      <PageHead title="Project Groups" sub="Milestones, tasks, blockers and mentor meetings by project group. Members log updates in Telegram.">
        <AddGroupButton cohortId={cohort.id} cohortSlug={cohort.slug} nextNumber={nextNumber} />
      </PageHead>

      <div className={t.stats}>
        {stat("Chats Connected", sum.chatsConnected, sum.groups)}
        {stat("Milestones Done", sum.milestonesDone, sum.milestones)}
        {stat("Overdue Milestones", sum.overdue, undefined, true)}
        {stat("Open Blockers", sum.openBlockers, undefined, true)}
        {stat("Meetings Overdue", sum.meetingsOverdue, undefined, true)}
      </div>

      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <h2 className={styles.h2}>Milestone Timeline</h2>
          <p className={styles.sectionHint}>Bars run from start to due date. A diamond is a milestone without a start date. Dates are Singapore time.</p>
        </div>
        {chart ? (
          <>
            <TrackerChart chart={chart} slug={cohort.slug} today={today} />
            <div className={t.legend}>
              <span className={t.legendItem}><span className={t.swatch} /> To do</span>
              <span className={t.legendItem}><span className={t.swatch} style={{ borderColor: "var(--emerald)", background: "#fff" }} /> In progress</span>
              <span className={t.legendItem}><span className={t.swatch} style={{ borderColor: "var(--emerald-strong)", background: "var(--emerald)" }} /> Done</span>
              <span className={t.legendItem}><span className={t.swatch} style={{ borderColor: "#b91c1c", background: "#fff" }} /> Overdue</span>
              <span className={t.legendItem}><span className={t.swatchDot} /> Open blocker</span>
              <span className={t.legendItem}><span style={{ width: 0, height: 12, borderLeft: "2px solid var(--emerald)" }} /> Today</span>
            </div>
          </>
        ) : (
          <p className={styles.emptyInline}>No milestones. Add them on a project group&apos;s page, or with /milestone in its chat.</p>
        )}
      </section>

      <section aria-label="Project groups">
        <div className={`${styles.tableWrap} ${t.groupsWrap}`}>
          <table className={`${styles.table} ${t.groupsTable}`}>
            <thead>
              <tr>
                <th>Group</th>
                <th>Mentors</th>
                <th>Telegram Chat</th>
                <th>Last Meeting</th>
                <th>Next Meeting By</th>
                <th>Milestones</th>
                <th>Open Blockers</th>
                <th>Reminders</th>
              </tr>
            </thead>
            <tbody>
              {data.map(({ group: g, milestones }) => {
                const overdueMeeting = new Date(`${nextMeetingBy(g)}T23:59:59+08:00`).getTime() < now.getTime();
                return (
                  <tr key={g.id}>
                    <td data-label="Group">
                      <Link className={t.link} href={runHref("DAP", cohort.slug, `project-groups/${g.id}`)}>
                        Group {g.number}
                      </Link>
                      <div className={styles.hint}>{g.name || "Unnamed"}</div>
                    </td>
                    <td data-label="Mentors">{g.mentors || "None"}</td>
                    <td data-label="Telegram Chat">
                      <span className={`${t.state} ${g.telegramChatId ? t.stateOk : t.stateMuted}`}>{g.telegramChatId ? "Connected" : "Not connected"}</span>
                    </td>
                    <td data-label="Last Meeting" className={t.num}>{g.lastMeetingAt ? shortDate(sgtDay(g.lastMeetingAt), today) : "None logged"}</td>
                    <td data-label="Next Meeting By" className={t.num}>
                      {overdueMeeting ? <span className={t.overdueText}>{shortDate(nextMeetingBy(g), today)}, overdue</span> : shortDate(nextMeetingBy(g), today)}
                    </td>
                    <td data-label="Milestones" className={t.num}>
                      {milestones.filter((m) => m.status === "done").length} of {milestones.length} done
                    </td>
                    <td data-label="Open Blockers" className={t.num}>{milestones.reduce((n, m) => n + m.blockers.filter((b) => b.status === "open").length, 0)}</td>
                    <td data-label="Reminders">
                      <span className={`${t.state} ${g.meetingRemindersOn ? t.stateOk : t.stateMuted}`}>{g.meetingRemindersOn ? "On" : "Off"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data.length === 0 && <p className={styles.emptyRow}>No project groups. Add one, then connect its Telegram chat on its page.</p>}
        </div>
      </section>

    </div>
  );
}
