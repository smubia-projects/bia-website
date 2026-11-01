import { requireActorPage } from "@/app/lib/cms/session";
import ProjectEditor from "../ProjectEditor";
import { editorOptions } from "../editorData";

export default async function NewProjectPage(props: { searchParams: Promise<{ cohort?: string; track?: string }> }) {
  const searchParams = await props.searchParams;
  const actor = await requireActorPage();
  const { cohorts, tracks, lodges } = await editorOptions();
  const trackId = Number(searchParams.track) || null;
  const preset = searchParams.cohort
    ? { cohortId: searchParams.cohort, trackId: tracks.some((t) => t.id === trackId && t.cohortId === searchParams.cohort) ? trackId : null }
    : null;
  return <ProjectEditor project={null} cohorts={cohorts} tracks={tracks} lodges={lodges} role={actor.role} preset={preset} />;
}
