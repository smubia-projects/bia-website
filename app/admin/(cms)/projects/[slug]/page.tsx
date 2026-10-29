import { notFound } from "next/navigation";
import { can } from "@/app/lib/cms/actor";
import { getProject } from "@/app/lib/cms/projects";
import { requireActorPage } from "@/app/lib/cms/session";
import ProjectEditor from "../ProjectEditor";
import { editorOptions } from "../editorData";

export default async function EditProjectPage({ params }: { params: { slug: string } }) {
  const actor = await requireActorPage();
  const project = await getProject(params.slug);
  if (!project || !can.editProject(actor, { programme: project.badge, trackId: project.trackId ?? null })) notFound();
  const { cohorts, tracks } = await editorOptions();
  return (
    <ProjectEditor key={project.updatedAt} project={project} cohorts={cohorts} tracks={tracks} role={actor.role} ownTrackId={actor.trackId} />
  );
}
