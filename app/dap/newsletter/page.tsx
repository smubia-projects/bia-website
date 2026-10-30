import Link from "next/link";
import ui from "@/app/components/cms/public.module.css";
import PeopleList from "@/app/components/cms/PeopleList";
import { getSiteLinks } from "@/app/lib/cms/links";
import { formatIssueDate, getPublicNewsletter, issuePath } from "@/app/lib/cms/newsletter";

export const revalidate = 3600;

export const metadata = {
  title: "This week in DAP | SMUBIA",
  description:
    "The Data Associate Programme's weekly newsletter: the co-learning session, project progress and what comes next.",
};

export default async function NewsletterPage() {
  const [{ cohort, sessions, issues }, links] = await Promise.all([getPublicNewsletter(), getSiteLinks()]);
  const latest = issues[0];
  const published = new Set(issues.map((i) => i.week));
  const lastWeek = latest?.week ?? 0;
  const current = sessions.find((s) => s.week === lastWeek + 1) ?? null;

  return (
    <main id="main-content" className={ui.page}>
      <div className={ui.newsTop}>
        <div className={ui.eyebrowLine}>Weekly newsletter{cohort ? ` · ${cohort.name}` : ""}</div>
        <h1 className={ui.h1}>
          This week in <em>DAP</em>
        </h1>
        <p className={ui.lede}>
          A weekly round-up of the co-learning session, project progress and what comes next.
        </p>
        <div className={ui.row} style={{ marginTop: 20 }}>
          <Link href="/dap" className={ui.pill}>
            DAP programme
          </Link>
          <Link href="/dap/projects" className={ui.pill}>
            DAP projects
          </Link>
          {links.dapNewsletter && (
            <a href={links.dapNewsletter} className={ui.pill} target="_blank" rel="noopener noreferrer">
              Get it on Telegram
            </a>
          )}
        </div>
      </div>

      <div className={ui.main}>
        {(latest || current?.topic) && (
          <div className={ui.latestRow}>
            {latest && (
              <Link href={issuePath(latest.cohortSlug, latest.week)} className={ui.latest}>
                <span className={ui.latestBadge}>
                  <span className={ui.label} style={{ color: "var(--mint)", fontSize: 11 }}>
                    Latest issue
                  </span>
                  <span className={ui.latestWeek}>W{latest.week}</span>
                </span>
                <span className={ui.latestBody}>
                  <span className={ui.label} style={{ fontSize: 11.5 }}>
                    This week in DAP · {formatIssueDate(latest.publishedAt)}
                  </span>
                  <span className={ui.latestTitle}>{latest.title}</span>
                  {latest.summary && <span className={ui.latestSummary}>{latest.summary}</span>}
                  <span className={ui.readMore}>Read the issue →</span>
                </span>
              </Link>
            )}
            {current?.topic && (
              <div className={ui.nextCard}>
                <span className={ui.label} style={{ fontSize: 11.5 }}>
                  Next co-learning session
                </span>
                <span className={ui.nextTopic}>{current.topic}</span>
                <span style={{ fontSize: 14 }}>
                  {current.group ? `Taught by ${current.group.name} · ` : ""}Week {current.week}
                </span>
                {current.group && <PeopleList people={current.group.members} compact label={`${current.group.name} members`} />}
              </div>
            )}
          </div>
        )}

        {sessions.some((s) => s.topic) && (
          <section className={ui.section}>
            <div className={ui.sectionHead}>
              <div>
                <h2 className={ui.h2}>Co-learning schedule</h2>
                <p className={ui.muted} style={{ margin: "6px 0 0", fontSize: 14 }}>
                  Each week, one group teaches the rest of the cohort.
                </p>
              </div>
            </div>
            <ol className={ui.schedule}>
              {sessions.map((s) => {
                const state = s.week <= lastWeek ? "Done" : s.week === lastWeek + 1 ? "This week" : "Upcoming";
                const stateClass =
                  state === "Done" ? ui.stateDone : state === "This week" ? ui.stateNow : ui.stateUpcoming;
                return (
                  <li key={s.week} className={`${ui.sessionRow} ${state === "This week" ? ui.sessionNow : ""}`}>
                    <span className={ui.sessionWeek}>WEEK {s.week}</span>
                    <span className={ui.sessionTopic}>{s.topic || "To be announced"}</span>
                    <span className={ui.sessionGroup}>{s.group?.name}</span>
                    <span className={`${ui.state} ${stateClass}`}>{state}</span>
                    {published.has(s.week) && cohort ? (
                      <Link href={issuePath(cohort.slug, s.week)} className={`${ui.pill} ${ui.pillSmall}`}>
                        Recap
                      </Link>
                    ) : (
                      <span />
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        <section className={ui.section}>
          <h2 className={ui.h2}>All issues</h2>
          {issues.length === 0 ? (
            <div className={ui.empty}>The first issue goes out after week 1 of the programme.</div>
          ) : (
            <div className={ui.issueGrid}>
              {issues.map((i, k) => (
                <Link key={i.id} href={issuePath(i.cohortSlug, i.week)} className={ui.issueCard}>
                  <span className={ui.row} style={{ justifyContent: "space-between" }}>
                    <span className={`${ui.issueWeek} ${k === 0 ? ui.issueWeekLatest : ""}`}>W{i.week}</span>
                    <span className={ui.muted} style={{ fontSize: 12 }}>
                      {formatIssueDate(i.publishedAt)}
                    </span>
                  </span>
                  <span className={ui.issueTitle}>{i.title}</span>
                  {i.summary && (
                    <span className={ui.cardDesc} style={{ fontSize: 14 }}>
                      {i.summary}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
