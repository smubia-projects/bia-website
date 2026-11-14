"use server";

import { revalidatePath } from "next/cache";
import { signOut } from "@/auth";
import { CmsError, type Actor } from "@/app/lib/cms/actor";
import { requireActor } from "@/app/lib/cms/session";
import * as projects from "@/app/lib/cms/projects";
import * as cohorts from "@/app/lib/cms/cohorts";
import * as lodgesCms from "@/app/lib/cms/lodges";
import * as newsletter from "@/app/lib/cms/newsletter";
import * as people from "@/app/lib/cms/people";
import { saveSiteLinks, setApplicationsOpen, type SiteLinksInput } from "@/app/lib/cms/links";
import { saveSitePhoto } from "@/app/lib/cms/photos";
import { createToken, revokeToken } from "@/app/lib/cms/tokens";
import * as tracker from "@/app/lib/cms/tracker";
import { noonSgt } from "@/app/lib/cms/bot-text";
import { createAdminLink, unlinkTelegram } from "@/app/lib/cms/telegram-link";
import * as webhook from "@/app/lib/cms/telegram-webhook";
import type { Photo } from "@/app/lib/photos";
import { UPLOAD_FOLDERS, uploadImage, type UploadFolder } from "@/app/lib/cms/uploads";
import type { BlockerStatus, MilestoneStatus, Programme, ProjectStatus } from "@/app/lib/cms/taxonomy";

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
    return { ok: false, error: "Action failed. Retry, and check the server logs if the error persists." };
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

export async function uploadImageAction(formData: FormData): Promise<ActionResult<string>> {
  return run(async () => {
    const file = formData.get("file");
    const folder = (formData.get("folder") as UploadFolder) || "projects";
    if (!UPLOAD_FOLDERS.includes(folder)) throw new CmsError("Unknown upload folder");
    if (!(file instanceof Blob)) throw new CmsError("No image received");
    const name = (formData.get("name") as string) || (file instanceof File ? file.name : "image.jpg");
    return uploadImage(file, name, folder);
  });
}

/** Replaces a site photo (or a gallery's list); null puts the original back. */
export async function saveSitePhotoAction(key: string, value: Photo | Photo[] | null) {
  return run(async (actor) => {
    await saveSitePhoto(actor, key, value);
    refreshAdmin();
    return null;
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
  input: cohorts.CohortInput
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

// ── Access tokens ────────────────────────────────────────────────────────

/** Returns the token itself, once. */
export async function createTokenAction(name: string, days: number) {
  return run(async (actor) => (await createToken(actor, { name, days })).token);
}

export async function revokeTokenAction(id: number) {
  return run(async (actor) => {
    await revokeToken(actor, id);
    return null;
  });
}

export async function setApplicationsOpenAction(programme: Programme, open: boolean) {
  return run(async (actor) => {
    await setApplicationsOpen(actor, programme, open);
    refreshAdmin();
    return null;
  }, open ? `${programme} applications are open` : `${programme} applications are closed`);
}

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
    refreshAdmin();
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

export async function savePersonAction(input: people.PersonInput) {
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


// ── DAP timeline tracker ─────────────────────────────────────────────────

/** Runs a tracker change as an admin and refreshes the dashboard. */
const track = <T,>(fn: (actor: Actor, who: tracker.TrackerWho) => Promise<T>, message?: string) =>
  run(async (actor) => {
    const data = await fn(actor, tracker.adminWho(actor));
    refreshAdmin();
    return data;
  }, message);

export async function saveProjectGroupAction(input: tracker.ProjectGroupInput) {
  return track(async (actor) => (await tracker.saveProjectGroup(actor, input)).id);
}

export async function deleteProjectGroupAction(id: number) {
  return track((actor) => tracker.deleteProjectGroup(actor, id).then(() => null));
}

export async function setMeetingRemindersAction(groupId: number, on: boolean) {
  return track((actor) => tracker.setMeetingReminders(actor, groupId, on).then(() => null));
}

export async function unregisterChatAction(groupId: number) {
  return track((actor) => tracker.unregisterChat(actor, groupId).then(() => null));
}

/** Logs a meeting on a date (YYYY-MM-DD, Singapore); today or no date means now. */
export async function logMeetingAction(groupId: number, date: string) {
  return track(async (_actor, who) => {
    const today = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
    await tracker.logMeeting(who, groupId, !date || date === today ? new Date() : noonSgt(date));
    return null;
  });
}

export async function saveMemberAction(input: { id?: number; groupId: number; name: string }) {
  return track((actor) => tracker.saveMember(actor, input).then(() => null));
}

export async function deleteMemberAction(id: number) {
  return track((actor) => tracker.deleteMember(actor, id).then(() => null));
}

export async function saveMilestoneAction(input: tracker.MilestoneInput) {
  return track((actor) => tracker.saveMilestone(actor, input).then(() => null));
}

export async function setMilestoneStatusAction(id: number, status: MilestoneStatus) {
  return track((actor) => tracker.setMilestoneStatus(actor, id, status).then(() => null));
}

export async function deleteMilestoneAction(id: number) {
  return track((actor) => tracker.deleteMilestone(actor, id).then(() => null));
}

export async function addSubtaskAction(input: { milestoneId: number } & tracker.SubtaskPatch) {
  return track((_a, who) => tracker.addSubtask(who, input).then(() => null));
}

export async function updateSubtaskAction(id: number, patch: tracker.SubtaskPatch) {
  return track((_a, who) => tracker.updateSubtask(who, id, patch).then(() => null));
}

export async function deleteSubtaskAction(id: number) {
  return track((_a, who) => tracker.deleteSubtask(who, id));
}

export async function addBlockerAction(input: { milestoneId: number; description: string }) {
  return track((_a, who) => tracker.addBlocker(who, input).then(() => null));
}

export async function updateBlockerAction(id: number, patch: { description?: string; status?: BlockerStatus }) {
  return track((_a, who) => tracker.updateBlocker(who, id, patch).then(() => null));
}

export async function deleteBlockerAction(id: number) {
  return track((_a, who) => tracker.deleteBlocker(who, id));
}

export async function getWebhookInfoAction() {
  return run((actor) => webhook.getWebhookInfo(actor));
}

export async function setWebhookAction() {
  return run(async (actor) => {
    await webhook.setWebhook(actor);
    return webhook.getWebhookInfo(actor);
  }, "Webhook set");
}

export async function deleteWebhookAction() {
  return run(async (actor) => {
    await webhook.deleteWebhook(actor);
    return webhook.getWebhookInfo(actor);
  }, "Webhook deleted");
}

export async function createTelegramLinkAction() {
  return run(async (actor) => createAdminLink(actor));
}

export async function unlinkTelegramAction() {
  return track((actor) => unlinkTelegram(actor).then(() => null), "Telegram unlinked");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/admin/login" });
}
