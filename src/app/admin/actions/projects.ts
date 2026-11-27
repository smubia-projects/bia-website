"use server";

import { CmsError } from "@/server/core/actor";
import * as projects from "@/server/projects/projects";
import type { ProjectStatus } from "@/shared/taxonomy";
import { type ActionResult, run, refreshAdmin } from "./run";

export type SaveIntent = "draft" | "submit" | "publish" | "keep";

export async function saveProjectAction(
  slug: string | null,
  input: projects.ProjectInput,
  intent: SaveIntent
): Promise<ActionResult<{ slug: string; status: ProjectStatus }>> {
  return run(async (actor) => {
    const target: ProjectStatus | null =
      intent === "draft" ? "draft" : intent === "submit" ? "in_review" : intent === "publish" ? "published" : null;
    if (target === "published" && !input.cohortId) {
      throw new CmsError("Semester (AI Lodge) or cohort (DAP) required before publishing");
    }
    let project = slug
      ? await projects.updateProject(actor, slug, input)
      : await projects.createProject(actor, { ...input, status: target ?? "draft" });
    if (slug && target && target !== project.status) {
      await projects.setProjectStatus(actor, project.slug, target);
      project = (await projects.getProject(project.slug))!;
    }
    refreshAdmin();
    return { slug: project.slug, status: project.status ?? "draft" };
  });
}

export async function approveProjectAction(slug: string) {
  return run(async (actor) => {
    await projects.setProjectStatus(actor, slug, "published");
    refreshAdmin();
    return null;
  }, "Project published");
}

export async function setWinnerAction(slug: string, winner: boolean) {
  return run(async (actor) => {
    await projects.setProjectWinner(actor, slug, winner);
    refreshAdmin();
    return null;
  });
}

export async function deleteProjectAction(slug: string) {
  return run(async (actor) => {
    await projects.deleteProject(actor, slug);
    refreshAdmin();
    return null;
  });
}
