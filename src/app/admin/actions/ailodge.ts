"use server";

import * as projects from "@/server/projects/projects";
import * as cohorts from "@/server/cohorts/cohorts";
import * as lodgesCms from "@/server/ailodge/lodges";
import { run, refreshAdmin } from "./run";

export async function saveTrackAction(input: cohorts.TrackInput) {
  return run(async (actor) => {
    const t = await cohorts.saveTrack(actor, input);
    refreshAdmin();
    return t.id;
  });
}

export async function moveTrackAction(id: number, direction: "up" | "down") {
  return run(async (actor) => {
    await cohorts.moveTrack(actor, id, direction);
    refreshAdmin();
    return null;
  });
}

export async function saveLodgeAction(input: lodgesCms.LodgeInput) {
  return run(async (actor) => {
    const l = await lodgesCms.saveLodge(actor, input);
    refreshAdmin();
    return l.id;
  });
}

export async function moveLodgeAction(id: number, direction: "up" | "down") {
  return run(async (actor) => {
    await lodgesCms.moveLodge(actor, id, direction);
    refreshAdmin();
    return null;
  });
}

export async function copyLodgeAction(id: number, toCohortId: string) {
  return run(async (actor) => {
    const l = await lodgesCms.copyLodge(actor, id, toCohortId);
    refreshAdmin();
    return l.id;
  });
}

export async function deleteLodgeAction(id: number) {
  return run(async (actor) => {
    await lodgesCms.deleteLodge(actor, id);
    refreshAdmin();
    return null;
  });
}

export async function setProjectLodgeAction(slug: string, lodgeId: number | null) {
  return run(async (actor) => {
    await projects.updateProject(actor, slug, { lodgeId });
    refreshAdmin();
    return slug;
  });
}

export async function deleteTrackAction(id: number) {
  return run(async (actor) => {
    await cohorts.deleteTrack(actor, id);
    refreshAdmin();
    return null;
  });
}
