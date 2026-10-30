import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import JoinCta from "@/app/components/cms/JoinCta";
import ProjectTile from "@/app/components/cms/ProjectTile";
import { usingLocalDb } from "@/app/lib/db";
import { cohortPath, projectPath } from "@/app/lib/cms/paths";
import type { Programme } from "@/app/lib/cms/taxonomy";
import { getPublicProjects } from "@/app/lib/projects";
import type { Project } from "@/app/projects/data/types";
import ProjectDetailContent from "./ProjectDetailContent";
import styles from "./ProjectDetail.module.css";

/*
 * Shared by /projects/ailodge/<semester>/<slug> and /dap/projects/<cohort>/<slug>.
 */

export interface ProjectParams {
  cohort: string;
  slug: string;
}

const RELATED_COUNT = 4;

export async function projectStaticParams(programme: Programme): Promise<ProjectParams[]> {
  // Next runs this in a separate worker; the local PGlite database can only be
  // opened by one process, so local dev renders project pages on demand.
  if (usingLocalDb()) return [];
  const projects = await getPublicProjects();
  return projects
    .filter((p) => p.badge === programme && p.cohortSlug)
    .map((p) => ({ cohort: p.cohortSlug!, slug: p.slug }));
}

export async function projectMetadata(params: ProjectParams): Promise<Metadata> {
  const project = (await getPublicProjects()).find((p) => p.slug === params.slug);
  if (!project) return { title: "Project not found | SMUBIA" };
  return {
    title: `${project.title} | SMUBIA Projects`,
    description: project.description,
    alternates: { canonical: projectPath(project) },
    openGraph: project.coverImage ? { images: [project.coverImage] } : undefined,
  };
}

export async function ProjectPage({ programme, params }: { programme: Programme; params: ProjectParams }) {
  const all = await getPublicProjects();
  const project = all.find((p) => p.slug === params.slug);
  if (!project) notFound();
  // Moved to another semester or programme since the link was shared.
  if (project.badge !== programme || project.cohortSlug !== params.cohort) redirect(projectPath(project));

  const cohortHref = cohortPath(programme, params.cohort);
  const cohortLabel = `${programme} ${project.cohortName ?? params.cohort}`;
  const sameCohort = all.filter((p) => p.cohortId === project.cohortId && p.slug !== project.slug);
  // Same track first, then the rest of the semester, in yearbook order.
  const related: Project[] = [
    ...sameCohort.filter((p) => project.trackId && p.trackId === project.trackId),
    ...sameCohort.filter((p) => !project.trackId || p.trackId !== project.trackId),
  ].slice(0, RELATED_COUNT);

  return (
    <main id="main-content" className={styles.page} style={{ paddingBottom: 0 }}>
      <div className={styles.container}>
        <ProjectDetailContent project={project} cohortHref={cohortHref} cohortLabel={cohortLabel} />

        {related.length > 0 && (
          <section className={styles.related} aria-labelledby="more-from">
            <div className={styles.relatedHead}>
              <h2 id="more-from" className={styles.relatedTitle}>
                More from {cohortLabel}
              </h2>
              {sameCohort.length > related.length && (
                <Link href={cohortHref} className={styles.viewAll}>
                  View all {sameCohort.length + 1} projects
                  <span aria-hidden="true">→</span>
                </Link>
              )}
            </div>
            <div className={styles.relatedGrid}>
              {related.map((p) => (
                <ProjectTile key={p.slug} project={p} variant="related" />
              ))}
            </div>
          </section>
        )}
      </div>

      <JoinCta
        programmes={[programme]}
        text={
          programme === "DAP"
            ? "Join the Data Associate Programme, build a machine learning project with your cohort, and we will feature it here."
            : "Join AI Lodge, build with your track through the semester, and show your project at Hack Day. We will feature it here."
        }
      />
    </main>
  );
}
