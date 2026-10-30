import { requireActorPage } from "@/app/lib/cms/session";
import ProjectEditor from "../ProjectEditor";
import { editorOptions } from "../editorData";

export default async function NewProjectPage({ searchParams }: { searchParams: { cohort?: string; track?: string } }) {
  const actor = await requireActorPage();
  const { cohorts, tracks } = await editorOptions();
  const trackId = Number(searchParams.track) || null;
  const preset = searchParams.cohort
    ? { cohortId: searchParams.cohort, trackId: tracks.some((t) => t.id === trackId && t.cohortId === searchParams.cohort) ? trackId : null }
    : null;
  return <ProjectEditor project={null} cohorts={cohorts} tracks={tracks} role={actor.role} ownTrackId={actor.trackId} preset={preset} />;
}
