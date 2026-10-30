"use server";

import { revalidatePath } from "next/cache";
import { signOut } from "@/auth";
import { CmsError, type Actor } from "@/app/lib/cms/actor";
import { requireActor } from "@/app/lib/cms/session";
import * as projects from "@/app/lib/cms/projects";
import * as cohorts from "@/app/lib/cms/cohorts";
import * as newsletter from "@/app/lib/cms/newsletter";
import * as people from "@/app/lib/cms/people";
import { saveSiteLinks, type SiteLinksInput } from "@/app/lib/cms/links";
import { uploadImage, type UploadFolder } from "@/app/lib/cms/uploads";
import type { CohortVisibility, Programme, ProjectStatus, Role } from "@/app/lib/cms/taxonomy";

export type ActionResult<T = null> = { ok: true; data: T; message?: string } | { ok: false; error: string };

/** Every action re-checks the session and turns CmsErrors into editor-facing messages. */
async function run<T>(fn: (actor: Actor) => Promise<T>, message?: string): Promise<ActionResult<T>> {
  try {
    const actor = await requireActor();
    const data = await fn(actor);
    return { ok: true, data, message };
  } catch (error) {
    if (error instanceof CmsError) return { ok: false, error: error.message };
    console.error("[cms action]", error);
    return { ok: false, error: "Something went wrong. Try again, and check the server logs if it keeps failing." };
  }
}

const refreshAdmin = () => revalidatePath("/admin", "layout");

// ── Projects ─────────────────────────────────────────────────────────────

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
      throw new CmsError("Pick a semester (AI Lodge) or cohort (DAP) before publishing");
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
  }, "Published");
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

export async function uploadImageAction(formData: FormData): Promise<ActionResult<string>> {
  return run(async () => {
    const file = formData.get("file");
    const folder = (formData.get("folder") as UploadFolder) || "projects";
    if (!(file instanceof Blob)) throw new CmsError("No image received");
    const name = (formData.get("name") as string) || (file instanceof File ? file.name : "image.jpg");
    return uploadImage(file, name, folder);
  });
}

// ── Cohorts and tracks ───────────────────────────────────────────────────

export async function createCohortAction(programme: Programme, slug: string, name: string) {
  return run(async (actor) => {
    const c = await cohorts.createCohort(actor, { programme, slug, name });
    refreshAdmin();
    return c.id;
  });
}

export async function saveCohortAction(
  id: string,
  input: { name?: string; visibility?: CohortVisibility; headline?: string; writeup?: string; hackDay?: string }
) {
  return run(async (actor) => {
    await cohorts.updateCohort(actor, id, input);
    refreshAdmin();
    return null;
  }, "Changes saved");
}

export async function saveTrackAction(input: cohorts.TrackInput) {
  return run(async (actor) => {
    const t = await cohorts.saveTrack(actor, input);
    refreshAdmin();
    return t.id;
  });
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

export async function moveTrackAction(id: number, direction: "up" | "down") {
  return run(async (actor) => {
    await cohorts.moveTrack(actor, id, direction);
    refreshAdmin();
    return null;
  });
}

export async function saveLodgeAction(input: cohorts.LodgeInput) {
  return run(async (actor) => {
    const l = await cohorts.saveLodge(actor, input);
    refreshAdmin();
    return l.id;
  });
}

export async function deleteLodgeAction(id: number) {
  return run(async (actor) => {
    await cohorts.deleteLodge(actor, id);
    refreshAdmin();
    return null;
  });
}

export async function saveGroupAction(input: cohorts.GroupInput) {
  return run(async (actor) => {
    const g = await cohorts.saveGroup(actor, input);
    refreshAdmin();
    return g.id;
  });
}

export async function deleteGroupAction(id: number) {
  return run(async (actor) => {
    await cohorts.deleteGroup(actor, id);
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

// ── Site links ───────────────────────────────────────────────────────────

export async function saveSiteLinksAction(input: SiteLinksInput) {
  return run(async (actor) => {
    await saveSiteLinks(actor, input);
    refreshAdmin();
    return null;
  }, "Saved");
}

// ── Newsletter ───────────────────────────────────────────────────────────

export async function createIssueAction(cohortId: string) {
  return run(async (actor) => (await newsletter.createIssue(actor, cohortId)).id);
}

export async function saveIssueAction(id: number, input: newsletter.IssueInput) {
  return run(async (actor) => {
    await newsletter.updateIssue(actor, id, input);
    refreshAdmin();
    return null;
  }, "Draft saved");
}

export async function publishIssueAction(id: number, input: newsletter.IssueInput) {
  return run(async (actor) => {
    await newsletter.updateIssue(actor, id, input);
    const { issue, telegram } = await newsletter.publishIssue(actor, id);
    refreshAdmin();
    return { week: issue.week, telegram };
  });
}

export async function scheduleIssueAction(id: number, input: newsletter.IssueInput, date: string) {
  return run(async (actor) => {
    await newsletter.updateIssue(actor, id, input);
    const issue = await newsletter.scheduleIssue(actor, id, date);
    refreshAdmin();
    return issue.publishAt;
  });
}

export async function revertIssueAction(id: number) {
  return run(async (actor) => {
    await newsletter.revertIssueToDraft(actor, id);
    refreshAdmin();
    return null;
  }, "Moved back to draft");
}

export async function deleteIssueAction(id: number) {
  return run(async (actor) => {
    await newsletter.deleteIssue(actor, id);
    refreshAdmin();
    return null;
  });
}

/** Saves first, so the test shows exactly what's in the editor. */
export async function sendIssueTestAction(id: number, input: newsletter.IssueInput, telegramUserId: string) {
  return run(async (actor) => {
    await newsletter.updateIssue(actor, id, input);
    const res = await newsletter.sendIssueTest(actor, id, telegramUserId);
    return res.dryRun ? "dry-run" : "sent";
  });
}

export async function saveSessionsAction(cohortId: string, rows: newsletter.SessionInput[]) {
  return run(async (actor) => {
    await newsletter.saveSessions(actor, cohortId, rows);
    refreshAdmin();
    return null;
  }, "Schedule saved");
}

// ── People ───────────────────────────────────────────────────────────────

export async function savePersonAction(input: { email: string; name?: string; role: Role }) {
  return run(async (actor) => {
    await people.savePerson(actor, input);
    refreshAdmin();
    return null;
  }, "Saved");
}

export async function removePersonAction(email: string) {
  return run(async (actor) => {
    await people.removePerson(actor, email);
    refreshAdmin();
    return null;
  }, "Removed");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/admin/login" });
}
