import Link from "next/link";
import { notFound } from "next/navigation";
import ui from "@/app/components/cms/public.module.css";
import JoinCta from "@/app/components/cms/JoinCta";
import PeopleList from "@/app/components/cms/PeopleList";
import { getPublicCohorts } from "@/app/lib/cms/cohorts";
import { getSiteLinks } from "@/app/lib/cms/links";
import { formatIssueDate, getPublicRun } from "@/app/lib/cms/newsletter";
import { cohortPath, dapRunPath } from "@/app/lib/cms/paths";
import { getPublicProjects } from "@/app/lib/projects";

export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

interface Props {
  params: { cohort: string };
}

export async function generateMetadata({ params }: Props) {
  const run = await getPublicRun(params.cohort);
  if (!run) return { title: "DAP | SMUBIA" };
  return {
    title: `DAP ${run.cohort.name} | SMUBIA`,
    description: `This week in DAP, the co-learning schedule and the groups of the ${run.cohort.name} Data Associate Programme.`,
    alternates: { canonical: dapRunPath(run.cohort.slug) },
  };
}

/** One DAP cohort's run: the latest issue, the co-learning schedule and the groups. */
export default async function DapRunPage({ params }: Props) {
  const [run, cohorts, links, projects] = await Promise.all([
    getPublicRun(params.cohort),
    getPublicCohorts("DAP"),
    getSiteLinks(),
    getPublicProjects(),
  ]);
  if (!run) notFound();
  const { cohort, sessions, issues } = run;
  const groups = (cohorts.find((c) => c.id === cohort.id)?.groups ?? []).filter((g) => g.members.length + g.mentors.length > 0);
  const projectCount = projects.filter((p) => p.cohortId === cohort.id).length;

  const latest = issues[0];
  const issueByWeek = new Map(issues.map((i) => [i.week, i]));
  const lastWeek = latest?.week ?? 0;
  const current = sessions.find((s) => s.week === lastWeek + 1) ?? null;
  // Every scheduled week, plus any issue written for a week that has no session row.
  const weeks = Array.from(new Set([...sessions.map((s) => s.week), ...issues.map((i) => i.week)])).sort((a, b) => a - b);
  const hasSchedule = sessions.some((s) => s.topic) || issues.length > 0;

  return (
    <main id="main-content" className={ui.page}>
      <div className={ui.newsTop}>
        <div className={ui.eyebrowLine}>Data Associate Programme · {cohort.name}</div>
        <h1 className={ui.h1}>
          This week in <em>DAP</em>
        </h1>
        <p className={ui.lede}>The weekly newsletter, co-learning schedule and groups of the {cohort.name}.</p>
        <div className={ui.row} style={{ marginTop: 20 }}>
          <Link href={cohortPath("DAP", cohort.slug)} className={ui.btn}>
            {projectCount > 0 ? `${cohort.name} projects (${projectCount})` : `${cohort.name} projects`}
          </Link>
          {groups.length > 0 && (
            <a href="#groups" className={ui.pill}>
              The groups
            </a>
          )}
          {links.dapNewsletter && (
            <a href={links.dapNewsletter} className={ui.pill} target="_blank" rel="noopener noreferrer">
              Get it on Telegram
            </a>
          )}
        </div>
        {cohorts.length > 1 && (
          <div role="group" aria-label="Cohort" className={ui.row} style={{ marginTop: 14 }}>
            {cohorts.map((c) => (
              <Link
                key={c.id}
                href={dapRunPath(c.slug)}
                aria-current={c.id === cohort.id ? "page" : undefined}
                className={`${ui.pill} ${ui.pillSmall} ${c.id === cohort.id ? ui.pillOn : ""}`}
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className={ui.main} style={{ paddingBottom: 24 }}>
        {(latest || current?.topic) && (
          <div className={ui.latestRow}>
            {latest && (
              <Link href={latest.path} className={ui.latest}>
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

        {hasSchedule ? (
          <section className={ui.section} aria-labelledby="schedule">
            <div className={ui.sectionHead}>
              <div>
                <h2 id="schedule" className={ui.h2}>
                  Co-learning schedule
                </h2>
                <p className={ui.muted} style={{ margin: "6px 0 0", fontSize: 14 }}>
                  Each week, one group teaches the rest of the cohort. Each recap is that week&apos;s issue.
                </p>
              </div>
            </div>
            <ol className={ui.schedule}>
              {weeks.map((week) => {
                const s = sessions.find((x) => x.week === week);
                const issue = issueByWeek.get(week);
                const state = week <= lastWeek ? "Done" : week === lastWeek + 1 ? "This week" : "Upcoming";
                const stateClass = state === "Done" ? ui.stateDone : state === "This week" ? ui.stateNow : ui.stateUpcoming;
                return (
                  <li key={week} className={`${ui.sessionRow} ${state === "This week" ? ui.sessionNow : ""}`}>
                    <span className={ui.sessionWeek}>WEEK {week}</span>
                    <span className={ui.sessionTopic}>{s?.topic || issue?.title || "To be announced"}</span>
                    <span className={ui.sessionGroup}>{s?.group?.name}</span>
                    <span className={`${ui.state} ${stateClass}`}>{state}</span>
                    <span className={ui.sessionLinks}>
                      {s?.slides && (
                        <a href={s.slides} className={`${ui.pill} ${ui.pillSmall}`} target="_blank" rel="noopener noreferrer">
                          Slides
                        </a>
                      )}
                      {issue && (
                        <Link href={issue.path} className={`${ui.pill} ${ui.pillSmall}`}>
                          Recap
                        </Link>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : (
          <div className={ui.empty} style={{ marginTop: 40 }}>
            The schedule and the first issue go out after week 1 of the programme.
          </div>
        )}

        {groups.length > 0 && (
          <section id="groups" className={ui.section} aria-labelledby="groups-title">
            <h2 id="groups-title" className={ui.h2}>
              The groups
            </h2>
            <p className={ui.muted} style={{ margin: "6px 0 0", fontSize: 14 }}>
              Each group teaches a co-learning session to the rest of the cohort, guided by its mentors.
            </p>
            <div className={ui.groupGrid}>
              {groups.map((g) => (
                <article key={g.id} className={ui.groupCard}>
                  <h3 className={ui.groupName}>{g.name}</h3>
                  <PeopleList people={g.members} label={`${g.name} members`} />
                  {g.mentors.length > 0 && (
                    <>
                      <p className={ui.groupLabel}>{g.mentors.length === 1 ? "Mentor" : "Mentors"}</p>
                      <PeopleList people={g.mentors} label={`${g.name} mentors`} />
                    </>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        <div className={ui.yearbookFoot} style={{ gap: 10, flexWrap: "wrap" }}>
          <Link href={cohortPath("DAP", cohort.slug)} className={ui.pill}>
            {cohort.name} projects →
          </Link>
          <Link href="/dap" className={ui.pill}>
            About the programme →
          </Link>
        </div>
      </div>

      <JoinCta
        programmes={["DAP"]}
        heading="Join the next cohort"
        text="Learn machine learning by teaching it: each group runs a co-learning session, builds a project with its mentors, and presents it at the end of the semester."
      />
    </main>
  );
}
