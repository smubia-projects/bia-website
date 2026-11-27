import type { Actor } from "@/app/lib/cms/actor";
import { listAllLodges, listAllTracks, listCohorts } from "@/app/lib/cms/cohorts";
import type { CohortOption, LodgeOption, TrackOption } from "./ProjectEditor";

/** Cohort, track and lodge options for the project editor's selects (a lodge head's own lodges and their semesters only). */
export async function editorOptions(actor: Actor): Promise<{ cohorts: CohortOption[]; tracks: TrackOption[]; lodges: LodgeOption[] }> {
  const [cohorts, tracks, lodges] = await Promise.all([listCohorts(), listAllTracks(), listAllLodges()]);
  const head = actor.role === "lodge_head";
  const myLodges = head ? lodges.filter((l) => (actor.lodgeIds ?? []).includes(l.id)) : lodges;
  const mySemesters = new Set(myLodges.map((l) => l.cohortId));
  return {
    cohorts: cohorts.filter((c) => !head || mySemesters.has(c.id)).map((c) => ({ id: c.id, slug: c.slug, name: c.name, programme: c.programme })),
    tracks: tracks.filter((t) => !head || mySemesters.has(t.cohortId)).map((t) => ({ id: t.id, name: t.name, cohortId: t.cohortId })),
    lodges: myLodges.map((l) => ({ id: l.id, name: l.name, cohortId: l.cohortId })),
  };
}
