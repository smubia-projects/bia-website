import Link from "next/link";
import Markdown from "@/app/components/ui/Markdown";
import ui from "@/app/components/cms/public.module.css";
import type { PublicCohort } from "@/app/lib/cms/cohorts";
import { BUILT_WITH } from "@/app/lib/cms/taxonomy";
import type { Project } from "@/app/Projects/data/types";
import DapYearbook, { type DapShelf } from "./DapYearbook";

const cohortHref = (c: PublicCohort, canonical: PublicCohort | null) =>
  c.id === canonical?.id ? "/DAP/projects" : `/DAP/projects/${c.slug}`;

/** The cohort /DAP/projects shows: the live one if it has projects, else the newest that does. */
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
  const canonical = defaultDapCohort(cohorts, projects);
  const mine = cohort ? projects.filter((p) => p.cohortId === cohort.id) : projects.filter((p) => !p.cohortId);
  const areas = [...BUILT_WITH, ""];
  const shelves: DapShelf[] = areas
    .map((area) => ({ name: area || "Other projects", projects: mine.filter((p) => (p.builtWith ?? "") === area) }))
    .filter((s) => s.projects.length > 0);
  const listed = cohorts.filter((c) => projects.some((p) => p.cohortId === c.id));

  return (
    <main id="main-content" className={ui.page}>
      <section className={`${ui.hero} ${ui.onDark}`}>
        <div className={ui.heroInner} style={{ paddingTop: 48, paddingBottom: 40 }}>
          <div className={ui.eyebrowLine}>DAP yearbook</div>
          <h1 className={ui.heroTitle}>{cohort?.name ?? "DAP projects"}</h1>
          {cohort?.writeup && (
            <div className={ui.heroLede}>
              <Markdown content={cohort.writeup} />
            </div>
          )}
          {listed.length > 1 && (
            <div role="group" aria-label="Cohort" className={ui.row} style={{ marginTop: 22 }}>
              {listed.map((c) => (
                <Link
                  key={c.id}
                  href={cohortHref(c, canonical)}
                  aria-current={c.id === cohort?.id ? "page" : undefined}
                  className={`${ui.cohortPill} ${c.id === cohort?.id ? ui.cohortPillOn : ""}`}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}
          <div className={ui.row} style={{ marginTop: 22 }}>
            <Link href="/DAP/newsletter" className={`${ui.pill} ${ui.pillOnDark}`}>
              This week in DAP
            </Link>
            <Link href="/Projects?programme=DAP" className={`${ui.pill} ${ui.pillOnDark}`}>
              Search all projects
            </Link>
          </div>
        </div>
      </section>

      <div className={ui.main} style={{ paddingTop: 8 }}>
        {shelves.length > 0 ? (
          <DapYearbook shelves={shelves} />
        ) : (
          <div className={ui.empty} style={{ marginTop: 48 }}>
            Projects from this cohort will appear here after Demo Day.
          </div>
        )}
      </div>
    </main>
  );
}
