import { notFound } from "next/navigation";
import { can } from "@/server/core/permissions";
import { getProject } from "@/server/projects/projects";
import { requireActorPage } from "@/server/auth/session";
import ProjectEditor from "@/app/admin/(cms)/projects/ProjectEditor";
import { editorOptions } from "@/app/admin/(cms)/projects/editorData";

export default async function EditProjectPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const actor = await requireActorPage();
  const project = await getProject(params.slug);
  if (!project || !can.seeProject(actor, { programme: project.badge, lodgeId: project.lodgeId })) notFound();
  const { cohorts, tracks, lodges } = await editorOptions(actor);
  return (
    <ProjectEditor
      key={project.updatedAt}
      project={project}
      cohorts={cohorts}
      tracks={tracks}
      lodges={lodges}
      role={actor.role}
      locked={!can.editProject(actor, { programme: project.badge, lodgeId: project.lodgeId, status: project.status })}
    />
  );
}
