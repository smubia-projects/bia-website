import Link from "next/link";
import Markdown from "@/app/components/ui/Markdown";
import JoinCta from "@/app/components/cms/JoinCta";
import YearbookShelves, { type Shelf } from "@/app/components/cms/YearbookShelves";
import { trackAccent } from "@/app/components/cms/visuals";
import ui from "@/app/components/cms/public.module.css";
import type { PublicCohort } from "@/app/lib/cms/cohorts";
import { getSiteLinks } from "@/app/lib/cms/links";
import { cohortPath } from "@/app/lib/cms/paths";
import type { Project } from "@/app/projects/data/types";

/** AI Lodge yearbook for one semester: dark header, write-up, one shelf per track. */
export default async function LodgeYearbook({
  cohort,
  cohorts,
  projects,
}: {
  cohort: PublicCohort | null;
  cohorts: PublicCohort[];
  projects: Project[];
}) {
  const lodgeSite = (await getSiteLinks()).aiLodgeInfosite.replace(/\/$/, "");
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
  const glanceTracks = (cohort?.tracks ?? []).filter((t) => t.projectCount > 0);
  const lodges = cohort?.lodges ?? [];
  const hasAbout = Boolean(cohort && (cohort.headline || cohort.writeup));
  const hasGlance = Boolean(cohort && (cohort.hackDay || glanceTracks.length > 0 || lodges.length > 0));

  return (
    <main id="main-content" className={ui.page}>
      <section className={`${ui.hero} ${ui.onDark}`}>
        <div className={ui.heroInner} style={{ paddingTop: 32 }}>
          <Link href="/projects" className={`${ui.pill} ${ui.pillOnDark} ${ui.pillSmall}`}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            All projects
          </Link>
          <div className={ui.eyebrowLine} style={{ marginTop: 24 }}>AI Lodge yearbook</div>
          <h1 className={ui.heroTitle}>{cohort?.name ?? "Coming soon"}</h1>
          {cohorts.length > 1 && (
            <div role="group" aria-label="Semester" className={ui.row} style={{ marginTop: 22 }}>
              {cohorts.map((c) => (
                <Link
                  key={c.id}
                  href={cohortPath("AI Lodge", c.slug)}
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

      <div className={ui.main} style={{ paddingBottom: 24 }}>
        {(hasAbout || hasGlance) && cohort && (
          <section aria-label="About this semester" className={ui.about}>
            {hasAbout && (
              <div className={ui.aboutMain}>
                <div className={ui.label}>About this semester</div>
                {cohort.headline && <h2 className={ui.aboutHeadline}>{cohort.headline}</h2>}
                {cohort.writeup && (
                  <div className={ui.aboutBody}>
                    <Markdown content={cohort.writeup} />
                  </div>
                )}
              </div>
            )}
            {hasGlance && (
              <div className={ui.aboutSide}>
                <div className={ui.label}>At a glance</div>
                {cohort.hackDay && (
                  <div className={ui.glanceItem}>
                    <span className={ui.glanceKey}>Hack Day</span>
                    <span className={ui.glanceValue}>{cohort.hackDay}</span>
                  </div>
                )}
                {glanceTracks.length > 0 && (
                  <div className={ui.glanceItem} style={{ gap: 6 }}>
                    <span className={ui.glanceKey}>Hack Day tracks</span>
                    {glanceTracks.map((t) => (
                      <a key={t.id} href={`#track-${t.id}`} className={ui.glanceTrack}>
                        <strong>{t.name}</strong>
                        <span>
                          {t.projectCount} {t.projectCount === 1 ? "project" : "projects"}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
                {lodges.length > 0 && (
                  <div className={ui.glanceItem} style={{ gap: 6 }}>
                    <span className={ui.glanceKey}>Lodges</span>
                    {lodges.map((l) => (
                      <a key={l.id} href={`${lodgeSite}${l.path}`} target="_blank" rel="noopener noreferrer" className={ui.glanceTrack}>
                        <strong>{l.name}</strong>
                        <span aria-hidden="true">↗</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {shelves.length > 0 ? (
          <YearbookShelves shelves={shelves} />
        ) : (
          <div className={ui.empty} style={{ marginTop: 48 }}>
            Projects for this semester will appear here after Hack Day.
          </div>
        )}

      </div>

      <JoinCta
        programmes={["AI Lodge"]}
        heading="Build at the next Hack Day"
        text="Join AI Lodge to learn applied AI in a small track, build your own project through the semester, and present it at Hack Day."
      />
    </main>
  );
}
