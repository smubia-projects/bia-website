import { requireActorPage } from "@/server/auth/session";
import ProjectEditor from "@/app/admin/(cms)/projects/ProjectEditor";
import { editorOptions } from "@/app/admin/(cms)/projects/editorData";

export default async function NewProjectPage(props: { searchParams: Promise<{ cohort?: string; track?: string }> }) {
  const searchParams = await props.searchParams;
  const actor = await requireActorPage();
  const { cohorts, tracks, lodges } = await editorOptions(actor);
  const trackId = Number(searchParams.track) || null;
  // Lodge heads start in their (latest) lodge's semester.
  const cohortId = searchParams.cohort ?? (actor.role === "lodge_head" ? lodges[lodges.length - 1]?.cohortId : undefined);
  const preset =
    cohortId && cohorts.some((c) => c.id === cohortId)
      ? { cohortId, trackId: tracks.some((t) => t.id === trackId && t.cohortId === cohortId) ? trackId : null }
      : null;
  return <ProjectEditor project={null} cohorts={cohorts} tracks={tracks} lodges={lodges} role={actor.role} preset={preset} />;
}
