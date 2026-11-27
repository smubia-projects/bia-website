"use server";

import * as cohorts from "@/server/cohorts/cohorts";
import * as newsletter from "@/server/dap/newsletter";
import { run, refreshAdmin } from "./run";

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
