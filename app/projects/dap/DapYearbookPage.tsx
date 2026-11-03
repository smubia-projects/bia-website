import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Markdown from "@/app/components/ui/Markdown";
import JoinCta from "@/app/components/cms/JoinCta";
import YearbookShelves, { type Shelf } from "@/app/components/cms/YearbookShelves";
import { trackAccent } from "@/app/components/cms/visuals";
import ui from "@/app/components/cms/public.module.css";
import type { PublicCohort } from "@/app/lib/cms/cohorts";
import { cohortPath, dapRunPath } from "@/app/lib/cms/paths";
import { BUILT_WITH } from "@/app/lib/cms/taxonomy";
import type { Project } from "@/app/projects/data/types";

/** The cohort /projects/dap shows: the live one if it has projects, else the newest that does. */
export function defaultDapCohort(cohorts: PublicCohort[], projects: Project[]) {
  const withProjects = cohorts.filter((c) => projects.some((p) => p.cohortId === c.id));
  return withProjects.find((c) => c.visibility === "live") ?? withProjects[0] ?? cohorts[0] ?? null;
}

/** DAP yearbook: same layout as AI Lodge, grouped by area instead of track. */
export default function DapYearbookPage({
  cohort,
  cohorts,
  projects,
}: {
  cohort: PublicCohort | null;
  cohorts: PublicCohort[];
  projects: Project[];
}) {
  const mine = cohort ? projects.filter((p) => p.cohortId === cohort.id) : projects.filter((p) => !p.cohortId);
  const areas = [...BUILT_WITH, ""];
  const shelves: Shelf[] = areas
    .map((area, i) => ({ key: `area-${i}`, name: area || "Other projects", accent: trackAccent(i), projects: mine.filter((p) => (p.builtWith ?? "") === area) }))
    .filter((s) => s.projects.length > 0);
  const listed = cohorts.filter((c) => projects.some((p) => p.cohortId === c.id));
  const groups = cohort?.groups.length ?? 0;

  return (
    <main id="main-content" className={ui.page}>
      <section className={`${ui.hero} ${ui.onDark}`}>
        <div className={ui.heroInner} style={{ paddingTop: 32 }}>
          <nav aria-label="Breadcrumb" className={ui.crumbs}>
            <Link href="/projects">Projects</Link>
            <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
          </nav>
          <div className={ui.eyebrowLine} style={{ marginTop: 20 }}>DAP yearbook</div>
          <h1 className={ui.heroTitle}>{cohort?.name ?? "DAP projects"}</h1>
          {listed.length > 1 && (
            <div role="group" aria-label="Cohort" className={ui.row} style={{ marginTop: 22 }}>
              {listed.map((c) => (
                <Link
                  key={c.id}
                  href={cohortPath("DAP", c.slug)}
                  aria-current={c.id === cohort?.id ? "page" : undefined}
                  className={`${ui.cohortPill} ${c.id === cohort?.id ? ui.cohortPillOn : ""}`}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}
          {cohort && (
            <dl className={ui.stats}>
              <div>
                <dt className={ui.statLabel}>{mine.length === 1 ? "Project" : "Projects"}</dt>
                <dd className={ui.statNum}>{mine.length}</dd>
              </div>
              {groups > 0 && (
                <div>
                  <dt className={ui.statLabel}>{groups === 1 ? "Co-learning group" : "Co-learning groups"}</dt>
                  <dd className={ui.statNum}>{groups}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </section>

      <div className={ui.main} style={{ paddingBottom: 24 }}>
        {cohort?.writeup && (
          <section aria-label="About this cohort" className={ui.about}>
            <div className={ui.aboutBody}>
              <Markdown content={cohort.writeup} />
            </div>
          </section>
        )}

        {shelves.length > 0 ? (
          <YearbookShelves shelves={shelves} groupLabel="Area" hideBuiltWith />
        ) : (
          <div className={ui.empty} style={{ marginTop: 48 }}>
            Projects from this cohort publish at the end of the semester.
          </div>
        )}

        {cohort && (
          <div className={ui.yearbookFoot}>
            <Link href={dapRunPath(cohort.slug)} className={ui.pill}>
              Cohort newsletter and schedule
              <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>

      <JoinCta
        programmes={["DAP"]}
        heading="Build a machine learning project"
        text="The Data Associate Programme teaches machine learning in a cohort. Each team builds a project and presents it at the end of the semester."
      />
    </main>
  );
}
