import { notFound } from "next/navigation";
import { can } from "@/app/lib/cms/actor";
import { getProject } from "@/app/lib/cms/projects";
import { requireActorPage } from "@/app/lib/cms/session";
import ProjectEditor from "../ProjectEditor";
import { editorOptions } from "../editorData";

export default async function EditProjectPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const actor = await requireActorPage();
  const project = await getProject(params.slug);
  if (!project || !can.editProject(actor, { programme: project.badge })) notFound();
  const { cohorts, tracks, lodges } = await editorOptions();
  return (
    <ProjectEditor key={project.updatedAt} project={project} cohorts={cohorts} tracks={tracks} lodges={lodges} role={actor.role} />
  );
}
