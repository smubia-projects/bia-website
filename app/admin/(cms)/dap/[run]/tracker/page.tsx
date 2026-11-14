import Link from "next/link";
import { shortDate, sgtDay } from "@/app/lib/cms/bot-text";
import { todaySgt } from "@/app/lib/cms/people";
import { getAllTimelines } from "@/app/lib/cms/tracker";
import { buildChart, nextMeetingBy, summarise } from "@/app/lib/cms/tracker-view";
import { expectedWebhookUrl } from "@/app/lib/cms/telegram-webhook";
import AddGroupButton from "../../../_run/AddGroupButton";
import TrackerChart from "../../../_run/TrackerChart";
import WebhookPanel from "../../../_run/WebhookPanel";
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

  const stat = (label: string, value: number, of?: number, alert?: boolean) => (
    <div className={t.stat}>
      <span className={t.statLabel}>{label}</span>
      <span className={`${t.statValue} ${alert && value > 0 ? t.statAlert : ""}`}>
        {value}
        {of !== undefined && <small>/{of}</small>}
      </span>
    </div>
  );

  return (
    <div className={styles.stack}>
      <PageHead title="Timeline Tracker" sub="Milestones, tasks, blockers and mentor meetings by project group. Members log updates in Telegram.">
        <AddGroupButton cohortId={cohort.id} cohortSlug={cohort.slug} nextNumber={nextNumber} />
      </PageHead>

      <div className={t.stats}>
        {stat("Groups", sum.groups)}
        {stat("Chats Registered", sum.chatsRegistered, sum.groups)}
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
          <p className={styles.emptyInline}>No milestones. DAP exco add them with /milestone in a group chat, or on a group&apos;s page.</p>
        )}
      </section>

      <section className={styles.panel}>
        <h2 className={styles.h2}>Project Groups</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table} style={{ minWidth: 760 }}>
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
                    <td>
                      <Link className={t.link} href={runHref("DAP", cohort.slug, `tracker/${g.id}`)}>
                        Group {g.number}
                      </Link>
                      <div className={styles.hint}>{g.name || "Unnamed"}</div>
                    </td>
                    <td>{g.mentors || "None"}</td>
                    <td>
                      <span className={`${t.chip} ${g.telegramChatId ? t.chipOk : t.chipMuted}`}>{g.telegramChatId ? "Registered" : "Not registered"}</span>
                    </td>
                    <td className={t.num}>{g.lastMeetingAt ? shortDate(sgtDay(g.lastMeetingAt), today) : "None logged"}</td>
                    <td className={t.num}>
                      {shortDate(nextMeetingBy(g), today)} {overdueMeeting && <span className={`${t.chip} ${t.chipWarn}`}>Overdue</span>}
                    </td>
                    <td className={t.num}>
                      {milestones.filter((m) => m.status === "done").length}/{milestones.length} done
                    </td>
                    <td className={t.num}>{milestones.reduce((n, m) => n + m.blockers.filter((b) => b.status === "open").length, 0)}</td>
                    <td>
                      <span className={`${t.chip} ${g.meetingRemindersOn ? t.chipOk : t.chipMuted}`}>{g.meetingRemindersOn ? "On" : "Off"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data.length === 0 && <p className={styles.emptyRow}>No groups. Add one, then send /register &lt;number&gt; in its Telegram chat.</p>}
        </div>
      </section>

      <WebhookPanel expectedUrl={expectedWebhookUrl()} tokenConfigured={Boolean(process.env.TELEGRAM_BOT_TOKEN)} secretConfigured={Boolean(process.env.TELEGRAM_WEBHOOK_SECRET)} />
    </div>
  );
}
