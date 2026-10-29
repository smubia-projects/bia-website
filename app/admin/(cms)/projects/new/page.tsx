import { requireActorPage } from "@/app/lib/cms/session";
import ProjectEditor from "../ProjectEditor";
import { editorOptions } from "../editorData";

export default async function NewProjectPage() {
  const actor = await requireActorPage();
  const { cohorts, tracks } = await editorOptions();
  return <ProjectEditor project={null} cohorts={cohorts} tracks={tracks} role={actor.role} ownTrackId={actor.trackId} />;
}
