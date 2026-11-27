import Link from "next/link";
import { ChevronRight, ExternalLink } from "lucide-react";
import Markdown from "@/app/components/ui/Markdown";
import JoinCta from "@/app/components/cms/JoinCta";
import YearbookShelves, { type Shelf } from "@/app/components/cms/YearbookShelves";
import { trackAccent } from "@/app/components/cms/visuals";
import ui from "@/app/components/cms/public.module.css";
import type { PublicCohort } from "@/app/lib/cms/cohorts";
import { getSiteLinks } from "@/app/lib/cms/links";
import { cohortPath } from "@/app/lib/cms/paths";
import type { Project } from "@/app/projects/data/types";

/** AI Lodge yearbook for one semester: header, write-up, filterable projects, then the lodges. */
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
      name: shelves.length ? "Other projects" : "Projects",
      accent: trackAccent(shelves.length),
      projects: unassigned,
    });
  }
  const lodges = cohort?.lodges ?? [];
  const trackCount = (cohort?.tracks ?? []).filter((t) => t.projectCount > 0).length;

  return (
    <main id="main-content" className={ui.page}>
      <section className={`${ui.hero} ${ui.onDark}`}>
        <div className={ui.heroInner} style={{ paddingTop: 32 }}>
          <nav aria-label="Breadcrumb" className={ui.crumbs}>
            <Link href="/projects">Projects</Link>
            <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
          </nav>
          <div className={ui.eyebrowLine} style={{ marginTop: 20 }}>AI Lodge yearbook</div>
          <h1 className={ui.heroTitle}>{cohort?.name ?? "No semesters published"}</h1>
          {cohort?.hackDay && <p className={ui.heroMeta}>Hack Day: {cohort.hackDay}</p>}
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
            <dl className={ui.stats}>
              <div>
                <dt className={ui.statLabel}>{mine.length === 1 ? "Project" : "Projects"}</dt>
                <dd className={ui.statNum}>{mine.length}</dd>
              </div>
              {trackCount > 0 && (
                <div>
                  <dt className={ui.statLabel}>{trackCount === 1 ? "Hack Day track" : "Hack Day tracks"}</dt>
                  <dd className={ui.statNum}>{trackCount}</dd>
                </div>
              )}
              {lodges.length > 0 && (
                <div>
                  <dt className={ui.statLabel}>{lodges.length === 1 ? "Lodge" : "Lodges"}</dt>
                  <dd className={ui.statNum}>{lodges.length}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </section>

      <div className={ui.main} style={{ paddingBottom: 24 }}>
        {cohort && (cohort.headline || cohort.writeup) && (
          <section aria-label="About this semester" className={ui.about}>
            {cohort.headline && <h2 className={ui.aboutHeadline}>{cohort.headline}</h2>}
            {cohort.writeup && (
              <div className={ui.aboutBody}>
                <Markdown content={cohort.writeup} />
              </div>
            )}
          </section>
        )}

        {shelves.length > 0 ? (
          <YearbookShelves shelves={shelves} groupLabel="Track" lodges={lodges.map((l) => ({ id: l.id, name: l.name }))} />
        ) : (
          <div className={ui.empty} style={{ marginTop: 48 }}>
            Projects for this semester publish after Hack Day.
          </div>
        )}

        {lodges.length > 0 && (
          <section className={ui.section} aria-labelledby="yearbook-lodges">
            <h2 id="yearbook-lodges" className={ui.h2}>
              Lodges
            </h2>
            <p className={ui.sectionNote}>Each lodge page opens on the AI Lodge site.</p>
            <div className={ui.lodgeGrid}>
              {lodges.map((l) => {
                const count = mine.filter((p) => p.lodgeId === l.id).length;
                return (
                  <a key={l.id} href={`${lodgeSite}${l.path}`} target="_blank" rel="noopener noreferrer" className={ui.lodgeCard}>
                    <span className={ui.lodgeMark} style={l.logo ? undefined : { background: l.accent }}>
                      {l.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.logo} alt="" />
                      ) : (
                        l.name.charAt(0)
                      )}
                    </span>
                    <span className={ui.lodgeText}>
                      <span className={ui.lodgeName}>
                        {l.name}
                        <ExternalLink size={14} strokeWidth={1.75} aria-label="Opens the AI Lodge site in a new tab" />
                      </span>
                      {l.tagline && <span className={ui.lodgeTagline}>{l.tagline}</span>}
                      {count > 0 && (
                        <span className={ui.cardMeta}>
                          {count} {count === 1 ? "project" : "projects"}
                        </span>
                      )}
                    </span>
                  </a>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <JoinCta
        programmes={["AI Lodge"]}
        heading="Build at the next Hack Day"
        text="AI Lodge teaches applied AI in small lodges. Each team builds a project over the semester and presents it at Hack Day."
      />
    </main>
  );
}
