"use server";

import { CmsError } from "@/server/core/actor";
import * as projects from "@/server/projects/projects";
import * as cohorts from "@/server/cohorts/cohorts";
import type { Programme } from "@/shared/taxonomy";
import { run, refreshAdmin } from "./run";

export async function createCohortAction(programme: Programme, slug: string, name: string) {
  return run(async (actor) => {
    const c = await cohorts.createCohort(actor, { programme, slug, name });
    refreshAdmin();
    return c.id;
  });
}

export async function saveCohortAction(
  id: string,
  input: cohorts.CohortInput
) {
  return run(async (actor) => {
    await cohorts.updateCohort(actor, id, input);
    refreshAdmin();
    return null;
  }, "Changes saved");
}

/** Moves a project into a semester/cohort and track (the Semesters and Cohorts pages). */
export async function placeProjectAction(slug: string, cohortId: string | null, trackId: number | null) {
  return run(async (actor) => {
    const cohort = cohortId ? await cohorts.getCohort(cohortId) : null;
    if (cohortId && !cohort) throw new CmsError("That semester no longer exists");
    const project = await projects.updateProject(actor, slug, {
      ...(cohort ? { programme: cohort.programme } : {}),
      cohortId,
      trackId,
    });
    refreshAdmin();
    return project.slug;
  });
}

/** Adds several projects to a semester/cohort and track in one go. */
export async function placeProjectsAction(slugs: string[], cohortId: string, trackId: number | null) {
  return run(async (actor) => {
    const cohort = await cohorts.getCohort(cohortId);
    if (!cohort) throw new CmsError("That semester no longer exists");
    for (const slug of slugs) {
      await projects.updateProject(actor, slug, { programme: cohort.programme, cohortId, trackId });
    }
    refreshAdmin();
    return slugs.length;
  });
}
