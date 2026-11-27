"use server";

import * as people from "@/server/people/people";
import * as tracker from "@/server/dap/tracker/service";
import { noonSgt } from "@/server/dap/tracker/bot-text";
import { createChatLink } from "@/server/people/telegram-link";
import type { BlockerStatus, MilestoneStatus } from "@/shared/taxonomy";
import { run, track } from "./run";

export async function saveProjectGroupAction(input: tracker.ProjectGroupInput) {
  return track(async (actor) => (await tracker.saveProjectGroup(actor, input)).id);
}

export async function deleteProjectGroupAction(id: number) {
  return track((actor) => tracker.deleteProjectGroup(actor, id).then(() => null));
}

export async function setMeetingRemindersAction(groupId: number, on: boolean) {
  return track((actor) => tracker.setMeetingReminders(actor, groupId, on).then(() => null));
}

export async function disconnectChatAction(groupId: number) {
  return track((actor) => tracker.disconnectChat(actor, groupId).then(() => null));
}

/** A one-time t.me link that adds the bot to a group chat and connects it to this project group. */
export async function createChatLinkAction(groupId: number) {
  return run((actor) => createChatLink(actor, groupId));
}

/** Logs a meeting on a date (YYYY-MM-DD, Singapore); today or no date means now. */
export async function logMeetingAction(groupId: number, date: string) {
  return track(async (_actor, who) => {
    const today = people.todaySgt();
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
