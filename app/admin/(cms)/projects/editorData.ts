import { listAllTracks, listCohorts } from "@/app/lib/cms/cohorts";
import type { CohortOption, TrackOption } from "./ProjectEditor";

/** Cohort and track options for the project editor's selects. */
export async function editorOptions(): Promise<{ cohorts: CohortOption[]; tracks: TrackOption[] }> {
  const [cohorts, tracks] = await Promise.all([listCohorts(), listAllTracks()]);
  return {
    cohorts: cohorts.map((c) => ({ id: c.id, name: c.name, programme: c.programme })),
    tracks: tracks.map((t) => ({ id: t.id, name: t.name, cohortId: t.cohortId })),
  };
}
