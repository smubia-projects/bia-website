import { ensure, type Actor } from "../../core/actor";
import { noonSgt, sgtDay } from "./bot-text";
import { listCohorts, pickCurrentCohort } from "../../cohorts/cohorts";
import { todaySgt } from "../../people/people";
import type { MilestoneStatus } from "../../../shared/taxonomy";
import * as tracker from "./service";
import { nextMeetingBy } from "./view";

/*
 * The DAP timeline tracker as MCP tools (app/api/mcp/route.ts): read-mostly views of project
 * groups and a few admin writes. Every write goes through tracker.ts, so its permissions and
 * validation apply; this file only shapes inputs and results. "Project group" everywhere: the
 * co-learning groups (get_dap_group / save_dap_group) are a different thing.
 */

/** The cohort a tool works on: the one given, else the current DAP cohort (the live one, else the newest). */
export async function dapCohortId(actor: Actor, cohortId?: string): Promise<string> {
  tracker.adminWho(actor); // DAP exco and exco admins only
  const dap = await listCohorts("DAP");
  if (cohortId) {
    ensure(dap.some((c) => c.id === cohortId), `No DAP cohort "${cohortId}". Use list_cohorts for the ids.`);
    return cohortId;
  }
  const current = pickCurrentCohort(dap);
  ensure(current, "There is no DAP cohort yet");
  return current.id;
}

export interface ProjectGroupProgress {
  id: number;
  number: number;
  name: string;
  mentors: string;
  chatConnected: boolean;
  milestonesDone: number;
  milestonesTotal: number;
  overdueMilestones: number;
  openBlockers: number;
  /** YYYY-MM-DD, Singapore; null when no meeting is logged */
  lastMeeting: string | null;
  /** YYYY-MM-DD, Singapore: when the next mentor meeting is due */
  nextMeetingBy: string;
  meetingRemindersOn: boolean;
}

/** list_project_groups: every project group of a cohort with its progress. */
export async function listProjectGroupProgress(actor: Actor, cohortId?: string) {
  const id = await dapCohortId(actor, cohortId);
  const today = todaySgt();
  const groups: ProjectGroupProgress[] = (await tracker.getAllTimelines(actor, id)).map(({ group, milestones }) => ({
    id: group.id,
    number: group.number,
    name: group.name,
    mentors: group.mentors,
    chatConnected: group.telegramChatId !== null,
    milestonesDone: milestones.filter((m) => m.status === "done").length,
    milestonesTotal: milestones.length,
    overdueMilestones: milestones.filter((m) => m.status !== "done" && m.dueOn < today).length,
    openBlockers: milestones.reduce((n, m) => n + m.blockers.filter((b) => b.status === "open").length, 0),
    lastMeeting: group.lastMeetingAt ? sgtDay(group.lastMeetingAt) : null,
    nextMeetingBy: nextMeetingBy(group),
    meetingRemindersOn: group.meetingRemindersOn,
  }));
  return { cohortId: id, today, projectGroups: groups };
}

/** get_project_group_timeline: one project group's milestones, with tasks and blockers. */
export async function projectGroupTimeline(actor: Actor, projectGroupId: number) {
  const who = tracker.adminWho(actor);
  const group = await tracker.projectGroup(who, projectGroupId);
  const [members, milestones] = await Promise.all([tracker.listMembers(who, projectGroupId), tracker.getTimeline(who, projectGroupId)]);
  const memberName = (id: number | null) => members.find((m) => m.id === id)?.name ?? null;
  const today = todaySgt();
  return {
    projectGroup: {
      id: group.id,
      cohortId: group.cohortId,
      number: group.number,
      name: group.name,
      mentors: group.mentors,
      chatConnected: group.telegramChatId !== null,
      lastMeeting: group.lastMeetingAt ? sgtDay(group.lastMeetingAt) : null,
      nextMeetingBy: nextMeetingBy(group),
      meetingRemindersOn: group.meetingRemindersOn,
    },
    members: members.map((m) => ({ id: m.id, name: m.name })),
    milestones: milestones.map((m) => ({
      id: m.id,
      // What the project group and the bot call it (M2); tools take the id.
      label: `${tracker.LABEL.milestone}${m.number}`,
      title: m.title,
      notes: m.notes,
      status: m.status,
      startsOn: m.startsOn,
      dueOn: m.dueOn,
      overdue: m.status !== "done" && m.dueOn < today,
      tasks: m.subtasks.map((s) => ({
        id: s.id,
        label: `${tracker.LABEL.task}${s.number}`,
        title: s.title,
        status: s.status,
        dueOn: s.dueOn,
        // A member on the list, or a name typed in for someone who isn't on it.
        assignee: memberName(s.assigneeId) ?? (s.assigneeName || null),
        assigneeOnMemberList: s.assigneeId !== null,
      })),
      blockers: m.blockers.map((b) => ({ id: b.id, label: `${tracker.LABEL.blocker}${b.number}`, description: b.description, status: b.status, resolvedAt: b.resolvedAt })),
    })),
  };
}

export interface NewMilestone {
  title: string;
  startsOn?: string | null;
  dueOn: string;
}

/**
 * add_milestones: the same milestones on several project groups of one cohort (all of them by
 * default). Every input is checked first, so a bad row adds nothing.
 */
export async function addMilestones(actor: Actor, cohortId: string, list: NewMilestone[], projectGroupIds?: number[]) {
  const id = await dapCohortId(actor, cohortId);
  ensure(list.length > 0, "Give at least one milestone");
  ensure(list.length <= 50, "Add at most 50 milestones at a time");
  list.forEach((m, i) => {
    const row = `Milestone ${i + 1}`;
    const title = m.title.trim();
    ensure(title, `${row}: a title is required`);
    ensure(title.length <= 200, `${row}: the title must be 200 characters or fewer`);
    ensure(tracker.isIsoDate(m.dueOn), `${row}: dueOn must be a real date (YYYY-MM-DD)`);
    ensure(!m.startsOn || tracker.isIsoDate(m.startsOn), `${row}: startsOn must be a real date (YYYY-MM-DD)`);
    ensure(!m.startsOn || m.startsOn <= m.dueOn, `${row}: startsOn must not be after dueOn`);
  });

  const groups = await tracker.listProjectGroups(actor, id);
  ensure(groups.length > 0, "This cohort has no project groups yet");
  let targets = groups;
  if (projectGroupIds?.length) {
    const unknown = projectGroupIds.filter((g) => !groups.some((x) => x.id === g));
    ensure(!unknown.length, `Not project groups of this cohort: ${unknown.join(", ")}`);
    targets = groups.filter((g) => projectGroupIds.includes(g.id));
  }

  const added: { projectGroupId: number; number: number; milestoneId: number; label: string; title: string; dueOn: string }[] = [];
  for (const group of targets) {
    for (const m of list) {
      const row = await tracker.saveMilestone(actor, { groupId: group.id, title: m.title.trim(), startsOn: m.startsOn || null, dueOn: m.dueOn });
      added.push({ projectGroupId: group.id, number: group.number, milestoneId: row.id, label: `${tracker.LABEL.milestone}${row.number}`, title: row.title, dueOn: row.dueOn });
    }
  }
  return { cohortId: id, added };
}

/** set_milestone_status */
export async function setMilestoneStatus(actor: Actor, milestoneId: number, status: MilestoneStatus) {
  const row = await tracker.setMilestoneStatus(actor, milestoneId, status);
  return { id: row.id, label: `${tracker.LABEL.milestone}${row.number}`, title: row.title, status: row.status };
}

/** log_project_group_meeting: today (or no date) means now; a past date is logged at noon Singapore time, like the dashboard. */
export async function logProjectGroupMeeting(actor: Actor, projectGroupId: number, date?: string) {
  const who = tracker.adminWho(actor);
  const today = todaySgt();
  if (date) ensure(tracker.isIsoDate(date), "date must be a real date (YYYY-MM-DD)");
  const group = await tracker.logMeeting(who, projectGroupId, !date || date === today ? new Date() : noonSgt(date));
  return { id: group.id, number: group.number, lastMeeting: sgtDay(group.lastMeetingAt!), nextMeetingBy: nextMeetingBy(group) };
}

/** set_meeting_reminders */
export async function setMeetingReminders(actor: Actor, projectGroupId: number, on: boolean) {
  const group = await tracker.setMeetingReminders(actor, projectGroupId, on);
  return { id: group.id, number: group.number, meetingRemindersOn: group.meetingRemindersOn };
}
