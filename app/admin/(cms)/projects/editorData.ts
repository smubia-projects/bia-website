import { listAllLodges, listAllTracks, listCohorts } from "@/app/lib/cms/cohorts";
import type { CohortOption, LodgeOption, TrackOption } from "./ProjectEditor";

/** Cohort, track and lodge options for the project editor's selects. */
export async function editorOptions(): Promise<{ cohorts: CohortOption[]; tracks: TrackOption[]; lodges: LodgeOption[] }> {
  const [cohorts, tracks, lodges] = await Promise.all([listCohorts(), listAllTracks(), listAllLodges()]);
  return {
    cohorts: cohorts.map((c) => ({ id: c.id, slug: c.slug, name: c.name, programme: c.programme })),
    tracks: tracks.map((t) => ({ id: t.id, name: t.name, cohortId: t.cohortId })),
    lodges: lodges.map((l) => ({ id: l.id, name: l.name, cohortId: l.cohortId })),
  };
}
