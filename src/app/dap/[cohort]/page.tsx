import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
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
  params: Promise<{ cohort: string }>;
}

export async function generateMetadata(props: Props) {
  const params = await props.params;
  const run = await getPublicRun(params.cohort);
  if (!run) return { title: "DAP | SMUBIA" };
  return {
    title: `DAP ${run.cohort.name} | SMUBIA`,
    description: `This week in DAP, the co-learning schedule and the groups of the ${run.cohort.name} Data Associate Programme.`,
    alternates: { canonical: dapRunPath(run.cohort.slug) },
  };
}

/** One DAP cohort's run: the latest issue, the co-learning schedule and the groups. */
export default async function DapRunPage(props: Props) {
  const params = await props.params;
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
  // Unannounced weeks at the end collapse into one row.
  const isAnnounced = (week: number) => Boolean(sessions.find((s) => s.week === week)?.topic || issueByWeek.get(week));
  const lastAnnounced = weeks.filter(isAnnounced).at(-1) ?? 0;
  const announced = weeks.filter((w) => w <= lastAnnounced);
  const tba = weeks.filter((w) => w > lastAnnounced);

  return (
    <main id="main-content" className={ui.page}>
      <div className={ui.newsTop}>
        <div className={ui.eyebrowLine}>Data Associate Programme · {cohort.name}</div>
        <h1 className={ui.h1}>
          This week in <em>DAP</em>
        </h1>
        {links.dapNewsletter && (
          <div className={ui.row} style={{ marginTop: 20 }}>
            <a href={links.dapNewsletter} className={ui.btn} target="_blank" rel="noopener noreferrer">
              Subscribe on Telegram
            </a>
          </div>
        )}
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
                {latest.coverImage && (
                  <span className={ui.latestCover}>
                    <Image src={latest.coverImage} alt="" fill sizes="(max-width: 768px) 100vw, 320px" style={{ objectFit: "cover" }} />
                  </span>
                )}
                <span className={ui.latestBody}>
                  <span className={ui.label}>Latest issue · {formatIssueDate(latest.publishedAt)}</span>
                  <span className={ui.latestTitle}>{latest.title}</span>
                  {latest.summary && <span className={ui.latestSummary}>{latest.summary}</span>}
                  <span className={ui.readMore}>Read the issue →</span>
                </span>
              </Link>
            )}
            {current?.topic && (
              <div className={ui.nextCard}>
                <span className={ui.label}>
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
                <p className={ui.sectionNote}>One group teaches the cohort each week.</p>
              </div>
            </div>
            <ol className={ui.schedule}>
              {announced.map((week) => {
                const s = sessions.find((x) => x.week === week);
                const issue = issueByWeek.get(week);
                const state = week <= lastWeek ? "Completed" : week === lastWeek + 1 ? "Next" : "Upcoming";
                const stateClass = state === "Completed" ? ui.stateDone : state === "Next" ? ui.stateNow : ui.stateUpcoming;
                const topic = s?.topic || issue?.title;
                return (
                  <li key={week} className={`${ui.sessionRow} ${state === "Next" ? ui.sessionNow : ""}`}>
                    <span className={ui.sessionWeek}>Week {week}</span>
                    <span className={topic ? ui.sessionTopic : ui.sessionTba}>{topic || "To be announced"}</span>
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
                          Read issue
                        </Link>
                      )}
                    </span>
                  </li>
                );
              })}
              {tba.length > 0 && (
                <li className={ui.sessionRow}>
                  <span className={ui.sessionWeek}>{tba.length > 1 ? `Weeks ${tba[0]}–${tba[tba.length - 1]}` : `Week ${tba[0]}`}</span>
                  <span className={ui.sessionTba}>To be announced</span>
                </li>
              )}
            </ol>
          </section>
        ) : (
          <div className={ui.empty} style={{ marginTop: 40 }}>
            The schedule and first issue publish after week 1.
          </div>
        )}

        {groups.length > 0 && (
          <section id="groups" className={ui.section} aria-labelledby="groups-title">
            <h2 id="groups-title" className={ui.h2}>
              Co-learning groups
            </h2>
            <p className={ui.sectionNote}>Each group teaches one session to the cohort, guided by its mentors.</p>
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

        <div className={ui.yearbookFoot}>
          <Link href={cohortPath("DAP", cohort.slug)} className={ui.pill}>
            {projectCount > 0 ? `Cohort projects (${projectCount})` : "Cohort projects"}
            <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <Link href="/dap" className={ui.pill}>
            About the programme
            <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <JoinCta
        programmes={["DAP"]}
        heading="Join the next cohort"
        text="Associates learn machine learning by teaching it: each runs a co-learning session with one group, then builds and presents a project with another."
      />
    </main>
  );
}
