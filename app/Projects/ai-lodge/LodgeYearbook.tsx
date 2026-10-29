import Link from "next/link";
import Markdown from "@/app/components/ui/Markdown";
import YearbookShelves, { type Shelf } from "@/app/components/cms/YearbookShelves";
import { trackAccent } from "@/app/components/cms/visuals";
import ui from "@/app/components/cms/public.module.css";
import type { PublicCohort } from "@/app/lib/cms/cohorts";
import type { Project } from "@/app/Projects/data/types";

const cohortHref = (c: PublicCohort) =>
  c.visibility === "live" ? "/Projects/ai-lodge" : `/Projects/ai-lodge/${c.slug}`;

/** AI Lodge yearbook for one semester: dark header, write-up, one shelf per track. */
export default function LodgeYearbook({
  cohort,
  cohorts,
  projects,
}: {
  cohort: PublicCohort | null;
  cohorts: PublicCohort[];
  projects: Project[];
}) {
  const mine = cohort ? projects.filter((p) => p.cohortId === cohort.id) : [];
  const shelves: Shelf[] = (cohort?.tracks ?? [])
    .map((t) => ({
      key: `track-${t.id}`,
      name: t.name,
      accent: trackAccent(t.position),
      projects: mine.filter((p) => p.trackId === t.id),
    }))
    .filter((s) => s.projects.length > 0);
  const unassigned = mine.filter((p) => !p.trackId || !cohort?.tracks.some((t) => t.id === p.trackId));
  if (unassigned.length) {
    shelves.push({
      key: "more-projects",
      name: shelves.length ? "More projects" : "Projects",
      accent: trackAccent(shelves.length),
      projects: unassigned,
    });
  }
  const tracksWithHeads = (cohort?.tracks ?? []).filter((t) => t.projectCount > 0 || t.heads);
  const hasAbout = Boolean(cohort && (cohort.headline || cohort.writeup));

  return (
    <main id="main-content" className={ui.page}>
      <section className={`${ui.hero} ${ui.onDark}`}>
        <div className={ui.heroInner}>
          <div className={ui.eyebrowLine}>AI Lodge yearbook</div>
          <h1 className={ui.heroTitle}>{cohort?.name ?? "Coming soon"}</h1>
          {cohorts.length > 1 && (
            <div role="group" aria-label="Semester" className={ui.row} style={{ marginTop: 22 }}>
              {cohorts.map((c) => (
                <Link
                  key={c.id}
                  href={cohortHref(c)}
                  aria-current={c.id === cohort?.id ? "page" : undefined}
                  className={`${ui.cohortPill} ${c.id === cohort?.id ? ui.cohortPillOn : ""}`}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}
          {cohort && (
            <div className={ui.stats}>
              <div>
                <div className={ui.statNum} style={{ color: "var(--sand)" }}>{mine.length}</div>
                <div className={ui.statLabel}>projects</div>
              </div>
              {cohort.tracks.length > 0 && (
                <div>
                  <div className={ui.statNum} style={{ color: "var(--mint)" }}>{cohort.tracks.length}</div>
                  <div className={ui.statLabel}>tracks</div>
                </div>
              )}
              {cohort.hackDay && (
                <div>
                  <div className={ui.statNum} style={{ color: "var(--sky)" }}>1</div>
                  <div className={ui.statLabel}>Hack Day</div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <div className={ui.main}>
        {hasAbout && cohort && (
          <section aria-label="About this semester" className={ui.about}>
            <div className={ui.aboutMain}>
              <div className={ui.label}>About this semester</div>
              {cohort.headline && <h2 className={ui.aboutHeadline}>{cohort.headline}</h2>}
              {cohort.writeup && (
                <div className={ui.aboutBody}>
                  <Markdown content={cohort.writeup} />
                </div>
              )}
            </div>
            {(cohort.hackDay || tracksWithHeads.length > 0) && (
              <div className={ui.aboutSide}>
                <div className={ui.label}>At a glance</div>
                {cohort.hackDay && (
                  <div className={ui.glanceItem}>
                    <span className={ui.glanceKey}>Hack Day</span>
                    <span className={ui.glanceValue}>{cohort.hackDay}</span>
                  </div>
                )}
                {tracksWithHeads.length > 0 && (
                  <div className={ui.glanceItem} style={{ gap: 6 }}>
                    <span className={ui.glanceKey}>Tracks and lodge heads</span>
                    {tracksWithHeads.map((t) => (
                      <a key={t.id} href={`#track-${t.id}`} className={ui.glanceTrack}>
                        <strong>{t.name}</strong>
                        <span>{t.heads}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {shelves.length > 0 ? (
          <YearbookShelves shelves={shelves} searchHref="/Projects?programme=AI%20Lodge" />
        ) : (
          <div className={ui.empty} style={{ marginTop: 48 }}>
            Projects for this semester will appear here after Hack Day.
          </div>
        )}
      </div>
    </main>
  );
}
