import { notFound } from "next/navigation";
import { can } from "@/server/core/actor";
import { cohortPath, yearbookPath } from "@/shared/paths";
import { getProject } from "@/server/projects/projects";
import { requireActorPage } from "@/server/auth/session";
import { PROJECT_STATUS_LABEL } from "@/shared/taxonomy";
import ProjectDetailContent from "@/app/projects/_detail/ProjectDetailContent";
import styles from "@/app/projects/_detail/ProjectDetail.module.css";
import PreviewBar from "../../../_components/PreviewBar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Preview | SMUBIA CMS", robots: { index: false, follow: false } };

/** A project page exactly as it will look, whatever its status. */
export default async function ProjectPreviewPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const actor = await requireActorPage();
  const project = await getProject(params.slug);
  if (!project || !can.seeProject(actor, { programme: project.badge, lodgeId: project.lodgeId })) notFound();
  const status = project.status ?? "draft";

  return (
    <>
      <PreviewBar
        note={status === "published" ? "Published." : `${PROJECT_STATUS_LABEL[status]}, not public.`}
        backHref={`/admin/projects/${project.slug}`}
        backLabel="Return to Editor"
      />
      <main id="main-content" className={styles.page} style={{ paddingTop: "4rem" }}>
        <div className={styles.container}>
          <ProjectDetailContent
            project={project}
            cohortHref={project.cohortSlug ? cohortPath(project.badge, project.cohortSlug) : yearbookPath(project.badge)}
            cohortLabel={project.cohortName ?? "No semester or cohort"}
          />
        </div>
      </main>
    </>
  );
}
