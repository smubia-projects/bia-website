import { notFound } from "next/navigation";
import { can } from "@/app/lib/cms/actor";
import { cohortPath, yearbookPath } from "@/app/lib/cms/paths";
import { getProject } from "@/app/lib/cms/projects";
import { requireActorPage } from "@/app/lib/cms/session";
import { PROJECT_STATUS_LABEL } from "@/app/lib/cms/taxonomy";
import ProjectDetailContent from "@/app/projects/_detail/ProjectDetailContent";
import styles from "@/app/projects/_detail/ProjectDetail.module.css";
import PreviewBar from "../../../_components/PreviewBar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Preview | SMUBIA CMS", robots: { index: false, follow: false } };

/** A project page exactly as it will look, whatever its status. */
export default async function ProjectPreviewPage({ params }: { params: { slug: string } }) {
  const actor = await requireActorPage();
  const project = await getProject(params.slug);
  if (!project || !can.editProject(actor, { programme: project.badge })) notFound();
  const status = project.status ?? "draft";

  return (
    <>
      <PreviewBar
        note={status === "published" ? "This project is live." : `${PROJECT_STATUS_LABEL[status]}: not on the site yet.`}
        backHref={`/admin/projects/${project.slug}`}
        backLabel="Back to the editor"
      />
      <main id="main-content" className={styles.page} style={{ paddingTop: "4rem" }}>
        <div className={styles.container}>
          <ProjectDetailContent
            project={project}
            cohortHref={project.cohortSlug ? cohortPath(project.badge, project.cohortSlug) : yearbookPath(project.badge)}
            cohortLabel={`${project.badge} ${project.cohortName ?? ""}`.trim()}
          />
        </div>
      </main>
    </>
  );
}
