import { and, asc, eq, gt, inArray, isNotNull, isNull, lte, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  blockers,
  cohorts,
  milestones,
  people,
  projectGroups,
  projectMembers,
  subtasks,
  type BlockerRow,
  type MilestoneRow,
  type ProjectGroupRow,
  type ProjectMemberRow,
  type SubtaskRow,
} from "@/server/db/schema";
import { ensure, type Actor } from "../../core/actor";
import { can } from "../../core/permissions";
import { findAccess } from "../../people/people";
import {
  BLOCKER_STATUSES,
  MEETING_DEADLINE_DAYS,
  MEETING_REMIND_DAYS,
  MILESTONE_STATUSES,
  SUBTASK_STATUSES,
  type BlockerStatus,
  type MilestoneStatus,
  type SubtaskStatus,
} from "../../../shared/taxonomy";

/*
 * DAP timeline tracker: project groups, their milestones, subtasks and blockers,
 * and the last-meeting reminder. Called by the Telegram webhook and the dashboard.
 *
 * Two kinds of caller:
 *  - admins (DAP exco and exco admins, `can.tracker`) work on every group;
 *  - members are whoever is in a group's connected Telegram chat, and only ever
 *    reach that group. Functions shared by both take a `TrackerWho`; admin-only
 *    ones take the Actor.
 * No db.transaction() (Neon HTTP has none): every write is one statement.
 */

export type TrackerWho = { name: string } & ({ admin: true } | { admin: false; groupId: number });

export function adminWho(actor: Actor): TrackerWho {
  ensure(can.tracker(actor), "This role cannot use the timeline tracker");
  return { admin: true, name: actor.name };
}

export const memberWho = (groupId: number, name: string): TrackerWho => ({ admin: false, groupId, name });

const inScope = (who: TrackerWho, groupId: number) => who.admin || who.groupId === groupId;

function requireTracker(actor: Actor) {
  ensure(can.tracker(actor), "This role cannot use the timeline tracker");
}

// ── Validation ───────────────────────────────────────────────────────────

function clean(value: string | undefined, label: string, max: number) {
  const v = (value ?? "").trim();
  ensure(v, `${label} is required`);
  ensure(v.length <= max, `${label} must be ${max} characters or fewer`);
  return v;
}

/** A real calendar date as YYYY-MM-DD ("2026-02-30" and "2026-13-01" are not). */
export function isIsoDate(value: string) {
  // Date.parse gives NaN for "2026-13-01"; toISOString would throw on it instead of failing the check.
  const time = /^\d{4}-\d{2}-\d{2}$/.test(value) ? Date.parse(`${value}T00:00:00Z`) : NaN;
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value;
}

function cleanDate(value: string | null | undefined, label: string): string | null {
  if (value == null || value === "") return null;
  ensure(isIsoDate(value), `${label} must be a real date (YYYY-MM-DD)`);
  return value;
}

function oneOf<T extends string>(list: readonly T[], value: string, label: string): T {
  ensure((list as readonly string[]).includes(value), `${label} must be one of: ${list.join(", ")}`);
  return value as T;
}

// ── Project groups and Telegram chats ────────────────────────────────────

export type ProjectGroup = ProjectGroupRow;

/** The cohort the bot works in: the live DAP cohort, else the newest one. */
export async function trackerCohortId(): Promise<string | null> {
  const db = await getDb();
  const [row] = await db
    .select({ id: cohorts.id })
    .from(cohorts)
    .where(eq(cohorts.programme, "DAP"))
    .orderBy(sql`(${cohorts.visibility} = 'live') desc`, sql`${cohorts.createdAt} desc`)
    .limit(1);
  return row?.id ?? null;
}

export async function listProjectGroups(actor: Actor, cohortId: string): Promise<ProjectGroup[]> {
  requireTracker(actor);
  const db = await getDb();
  return db.select().from(projectGroups).where(eq(projectGroups.cohortId, cohortId)).orderBy(asc(projectGroups.number));
}

export interface ProjectGroupInput {
  id?: number;
  cohortId: string;
  number: number;
  name?: string;
  mentors?: string;
}

export async function saveProjectGroup(actor: Actor, input: ProjectGroupInput): Promise<ProjectGroup> {
  requireTracker(actor);
  ensure(Number.isInteger(input.number) && input.number > 0, "Group number must be a positive whole number");
  const values = { number: input.number, name: (input.name ?? "").trim().slice(0, 120), mentors: (input.mentors ?? "").trim().slice(0, 300) };
  const db = await getDb();
  const clash = await db
    .select({ id: projectGroups.id })
    .from(projectGroups)
    .where(and(eq(projectGroups.cohortId, input.cohortId), eq(projectGroups.number, input.number)));
  ensure(clash.every((g) => g.id === input.id), `Group ${input.number} already exists`);
  let row: ProjectGroup | undefined;
  if (input.id) {
    [row] = await db.update(projectGroups).set(values).where(eq(projectGroups.id, input.id)).returning();
    ensure(row, "Group not found");
  } else {
    [row] = await db.insert(projectGroups).values({ cohortId: input.cohortId, ...values }).returning();
  }
  return row!;
}

export async function deleteProjectGroup(actor: Actor, id: number) {
  requireTracker(actor);
  const db = await getDb();
  await db.delete(projectGroups).where(eq(projectGroups.id, id));
}

export async function setMeetingReminders(actor: Actor, groupId: number, on: boolean) {
  requireTracker(actor);
  const db = await getDb();
  const [row] = await db.update(projectGroups).set({ meetingRemindersOn: on }).where(eq(projectGroups.id, groupId)).returning();
  ensure(row, "Group not found");
  return row;
}

/**
 * Connects a group chat to a project group. Only called with a used one-time chat link
 * (telegram-link.ts), which is what authorises it. The bot listens only in connected chats,
 * and everyone in one has member rights for that project group. Connecting again replaces
 * the group's chat, and a chat moved to another project group leaves the old one.
 */
export async function connectChat(projectGroupId: number, chatId: number): Promise<ProjectGroup> {
  ensure(Number.isSafeInteger(chatId) && chatId < 0, "Connect a group chat, not a private chat");
  const db = await getDb();
  // telegram_chat_id is unique: free the chat from any other project group first.
  await db.update(projectGroups).set({ telegramChatId: null }).where(and(eq(projectGroups.telegramChatId, chatId), ne(projectGroups.id, projectGroupId)));
  const [row] = await db.update(projectGroups).set({ telegramChatId: chatId }).where(eq(projectGroups.id, projectGroupId)).returning();
  ensure(row, "Project group not found");
  return row;
}

/** A cohort's slug, for links into the CMS. */
export async function cohortSlug(cohortId: string): Promise<string | null> {
  const db = await getDb();
  const [row] = await db.select({ slug: cohorts.slug }).from(cohorts).where(eq(cohorts.id, cohortId));
  return row?.slug ?? null;
}

/** One project group, if it is in scope (a member sees only their own). */
export async function projectGroup(who: TrackerWho, id: number): Promise<ProjectGroup> {
  ensure(inScope(who, id), "Group not found");
  const db = await getDb();
  const [row] = await db.select().from(projectGroups).where(eq(projectGroups.id, id));
  ensure(row, "Group not found");
  return row;
}

/** A group of the current cohort by its number, for admins naming a group in a command. */
export async function groupByNumber(actor: Actor, number: number): Promise<ProjectGroup> {
  requireTracker(actor);
  const cohortId = await trackerCohortId();
  const db = await getDb();
  const [group] = cohortId
    ? await db.select().from(projectGroups).where(and(eq(projectGroups.cohortId, cohortId), eq(projectGroups.number, number)))
    : [];
  ensure(group, `Group ${number} does not exist`);
  return group;
}

/**
 * Telegram gives a group a new chat ID when it is upgraded to a supergroup, which
 * would silently stop the bot working there; the migration message carries both IDs.
 */
export async function migrateChat(oldChatId: number, newChatId: number) {
  const db = await getDb();
  await db.update(projectGroups).set({ telegramChatId: newChatId }).where(eq(projectGroups.telegramChatId, oldChatId));
}

export async function disconnectChat(actor: Actor, groupId: number) {
  requireTracker(actor);
  const db = await getDb();
  await db.update(projectGroups).set({ telegramChatId: null }).where(eq(projectGroups.id, groupId));
}

/** The admin a Telegram user ID belongs to (role and access end re-read now), or null. */
export async function adminByTelegramId(fromId: number): Promise<Actor | null> {
  const db = await getDb();
  const [person] = await db.select({ email: people.email }).from(people).where(eq(people.telegramUserId, fromId));
  const actor = person ? await findAccess(person.email) : null;
  return actor && can.tracker(actor) ? actor : null;
}

/** The project groups of the current cohort that have a connected chat: where a Mini App user's membership is checked. */
export async function connectedGroups(): Promise<ProjectGroup[]> {
  const cohortId = await trackerCohortId();
  if (!cohortId) return [];
  const db = await getDb();
  return db
    .select()
    .from(projectGroups)
    .where(and(eq(projectGroups.cohortId, cohortId), isNotNull(projectGroups.telegramChatId)))
    .orderBy(asc(projectGroups.number));
}

/**
 * Who is speaking, and where. Admins are found by their stored Telegram user ID
 * (role re-read each time, so removal or an ended access date takes effect at once)
 * and may act in any chat. Anyone else is a member only inside a connected chat;
 * everyone else gets null, and the bot stays silent.
 */
export async function resolveSender(chatId: number, fromId: number, displayName: string) {
  const db = await getDb();
  const [group] = await db.select().from(projectGroups).where(eq(projectGroups.telegramChatId, chatId));
  const actor = await adminByTelegramId(fromId);
  if (actor) return { who: adminWho(actor), actor, group: group ?? null };
  if (group) return { who: memberWho(group.id, displayName), actor: null, group };
  return null;
}

// ── Roster (dashboard; informational) ────────────────────────────────────

export async function listMembers(who: TrackerWho, groupId: number): Promise<ProjectMemberRow[]> {
  ensure(inScope(who, groupId), "Group not found");
  const db = await getDb();
  return db.select().from(projectMembers).where(eq(projectMembers.groupId, groupId)).orderBy(asc(projectMembers.name));
}

export async function saveMember(actor: Actor, input: { id?: number; groupId: number; name: string }) {
  requireTracker(actor);
  const name = clean(input.name, "Name", 120);
  const db = await getDb();
  if (input.id) {
    const [row] = await db.update(projectMembers).set({ name }).where(eq(projectMembers.id, input.id)).returning();
    ensure(row, "Member not found");
    return row;
  }
  const [row] = await db.insert(projectMembers).values({ groupId: input.groupId, name }).returning();
  return row!;
}

export async function deleteMember(actor: Actor, id: number) {
  requireTracker(actor);
  const db = await getDb();
  await db.delete(projectMembers).where(eq(projectMembers.id, id));
}

// ── Timeline: milestones, subtasks, blockers ─────────────────────────────

const SEQ = { milestone: "milestoneSeq", task: "taskSeq", blocker: "blockerSeq" } as const;
export type ItemKind = keyof typeof SEQ;
/** How a number is shown: M2 for a milestone, T5 for a task, B1 for a blocker. */
export const LABEL: Record<ItemKind, string> = { milestone: "M", task: "T", blocker: "B" };

/**
 * The next number in a project group for a milestone, task or blocker. One UPDATE … RETURNING,
 * so two writers never get the same number; a number is never given out again after a delete.
 */
async function nextNumber(groupId: number, kind: ItemKind): Promise<number> {
  const db = await getDb();
  const column = projectGroups[SEQ[kind]];
  const [row] = await db.update(projectGroups).set({ [SEQ[kind]]: sql`${column} + 1` }).where(eq(projectGroups.id, groupId)).returning({ n: column });
  ensure(row, "Group not found");
  return row.n;
}

/** A milestone, task or blocker's ID from the number its project group sees (M2, T5, B1). */
export async function idByNumber(who: TrackerWho, groupId: number, kind: ItemKind, number: number): Promise<number> {
  ensure(inScope(who, groupId), "Group not found");
  const db = await getDb();
  const inGroup = eq(milestones.groupId, groupId);
  const [row] =
    kind === "milestone"
      ? await db.select({ id: milestones.id }).from(milestones).where(and(inGroup, eq(milestones.number, number)))
      : kind === "task"
        ? await db.select({ id: subtasks.id }).from(subtasks).innerJoin(milestones, eq(milestones.id, subtasks.milestoneId)).where(and(inGroup, eq(subtasks.number, number)))
        : await db.select({ id: blockers.id }).from(blockers).innerJoin(milestones, eq(milestones.id, blockers.milestoneId)).where(and(inGroup, eq(blockers.number, number)));
  ensure(row, `${kind[0].toUpperCase()}${kind.slice(1)} ${LABEL[kind]}${number} not found`);
  return row.id;
}

export interface MilestoneDetail extends MilestoneRow {
  subtasks: SubtaskRow[];
  blockers: BlockerRow[];
}

async function loadDetails(groupIds: number[]): Promise<Map<number, MilestoneDetail[]>> {
  const out = new Map<number, MilestoneDetail[]>(groupIds.map((id) => [id, []]));
  if (!groupIds.length) return out;
  const db = await getDb();
  const ms = await db.select().from(milestones).where(inArray(milestones.groupId, groupIds)).orderBy(asc(milestones.dueOn), asc(milestones.id));
  const ids = ms.map((m) => m.id);
  const [subs, blks] = ids.length
    ? await Promise.all([
        db.select().from(subtasks).where(inArray(subtasks.milestoneId, ids)).orderBy(asc(subtasks.id)),
        db.select().from(blockers).where(inArray(blockers.milestoneId, ids)).orderBy(asc(blockers.id)),
      ])
    : [[], []];
  for (const m of ms) {
    out.get(m.groupId)!.push({
      ...m,
      subtasks: subs.filter((s) => s.milestoneId === m.id),
      blockers: blks.filter((b) => b.milestoneId === m.id),
    });
  }
  return out;
}

/** A group's whole timeline, in due-date order. Members can read only their own group's. */
export async function getTimeline(who: TrackerWho, groupId: number): Promise<MilestoneDetail[]> {
  ensure(inScope(who, groupId), "Group not found");
  return (await loadDetails([groupId])).get(groupId)!;
}

/** The dashboard: every group of a cohort with its timeline. */
export async function getAllTimelines(actor: Actor, cohortId: string) {
  const groups = await listProjectGroups(actor, cohortId);
  const details = await loadDetails(groups.map((g) => g.id));
  return groups.map((group) => ({ group, milestones: details.get(group.id)! }));
}

/** One milestone with its subtasks and blockers, if it is in the caller's scope. */
export async function getMilestone(who: TrackerWho, id: number): Promise<MilestoneDetail> {
  const db = await getDb();
  const [m] = await db.select({ groupId: milestones.groupId }).from(milestones).where(eq(milestones.id, id));
  ensure(m && inScope(who, m.groupId), "Milestone not found");
  return (await loadDetails([m.groupId])).get(m.groupId)!.find((x) => x.id === id)!;
}

/** The group a milestone belongs to, checked against the caller's scope. */
async function scopedMilestoneGroup(who: TrackerWho, milestoneId: number, what = "Milestone") {
  const db = await getDb();
  const [m] = await db.select({ groupId: milestones.groupId }).from(milestones).where(eq(milestones.id, milestoneId));
  ensure(m && inScope(who, m.groupId), `${what} not found`);
  return m.groupId;
}

/** "15 Dec 2026", for messages that name a date. */
const niceDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** A task can't be due after the milestone it belongs to. Throws the message the editor sees. */
export function checkTaskDue(milestone: { number: number; dueOn: string }, dueOn: string | null | undefined) {
  ensure(!dueOn || dueOn <= milestone.dueOn, `A task can't be due after its milestone: ${LABEL.milestone}${milestone.number} is due ${niceDate(milestone.dueOn)}.`);
}

export interface MilestoneInput {
  id?: number;
  groupId: number;
  title: string;
  notes?: string;
  startsOn?: string | null;
  dueOn: string;
  status?: MilestoneStatus;
}

/** Admins only: members can read milestones but not change them. */
export async function saveMilestone(actor: Actor, input: MilestoneInput): Promise<MilestoneRow> {
  requireTracker(actor);
  const startsOn = cleanDate(input.startsOn, "Start date");
  const dueOn = cleanDate(input.dueOn, "Due date");
  ensure(dueOn, "Due date is required");
  const db = await getDb();
  const [current] = input.id ? await db.select().from(milestones).where(eq(milestones.id, input.id)) : [];
  ensure(!input.id || current, "Milestone not found");
  // On edit a start date left out keeps the stored one, so check the dates as they will be saved.
  const effectiveStart = input.startsOn !== undefined ? startsOn : (current?.startsOn ?? null);
  ensure(!effectiveStart || effectiveStart <= dueOn, "Start date must not be after the due date");
  if (current && dueOn < current.dueOn) {
    // Moving the deadline earlier must not leave a task due after it.
    const late = await db
      .select({ number: subtasks.number, dueOn: subtasks.dueOn })
      .from(subtasks)
      .where(and(eq(subtasks.milestoneId, current.id), gt(subtasks.dueOn, dueOn)))
      .orderBy(asc(subtasks.number));
    const list = late.slice(0, 3).map((x) => `${LABEL.task}${x.number} (${niceDate(x.dueOn!)})`).join(", ") + (late.length > 3 ? ` and ${late.length - 3} more` : "");
    ensure(!late.length, `${list} ${late.length === 1 ? "is" : "are"} due after ${niceDate(dueOn)}. Change ${late.length === 1 ? "its" : "their"} due date first.`);
  }
  const values = {
    title: clean(input.title, "Title", 200),
    // On edit, fields left out stay as they are.
    ...(input.notes !== undefined ? { notes: input.notes.trim().slice(0, 2000) } : {}),
    ...(input.startsOn !== undefined ? { startsOn } : {}),
    dueOn,
    ...(input.status ? { status: oneOf(MILESTONE_STATUSES, input.status, "Status") } : {}),
    updatedAt: new Date().toISOString(),
    updatedBy: actor.name,
  };
  if (input.id) {
    const [row] = await db.update(milestones).set(values).where(eq(milestones.id, input.id)).returning();
    ensure(row, "Milestone not found");
    return row;
  }
  const number = await nextNumber(input.groupId, "milestone");
  const [row] = await db.insert(milestones).values({ groupId: input.groupId, number, ...values }).returning();
  return row!;
}

/** /done: an admin logs that a group finished a milestone. */
export async function setMilestoneStatus(actor: Actor, id: number, status: MilestoneStatus) {
  requireTracker(actor);
  const db = await getDb();
  const [row] = await db
    .update(milestones)
    .set({ status: oneOf(MILESTONE_STATUSES, status, "Status"), updatedAt: new Date().toISOString(), updatedBy: actor.name })
    .where(eq(milestones.id, id))
    .returning();
  ensure(row, "Milestone not found");
  return row;
}

export async function deleteMilestone(actor: Actor, id: number) {
  requireTracker(actor);
  const db = await getDb();
  await db.delete(milestones).where(eq(milestones.id, id));
}

export interface SubtaskPatch {
  title?: string;
  status?: SubtaskStatus;
  /** null clears */
  dueOn?: string | null;
  /** A member on the list; null clears the assignee (also a typed name) */
  assigneeId?: number | null;
  /** Someone not on the member list, as typed; "" clears it */
  assigneeName?: string;
}

/** The assignee columns a patch writes: a member and a typed name never both. */
function assigneeColumns(patch: SubtaskPatch) {
  if (patch.assigneeId != null) return { assigneeId: patch.assigneeId, assigneeName: "" };
  if (patch.assigneeName) return { assigneeId: null, assigneeName: clean(patch.assigneeName, "Assignee", 80) };
  if (patch.assigneeId === null) return { assigneeId: null, assigneeName: "" };
  if (patch.assigneeName === "") return { assigneeName: "" };
  return {};
}

async function checkAssignee(groupId: number, assigneeId: number | null | undefined) {
  if (assigneeId == null) return;
  const db = await getDb();
  const [m] = await db.select({ groupId: projectMembers.groupId }).from(projectMembers).where(eq(projectMembers.id, assigneeId));
  ensure(m && m.groupId === groupId, "The assignee is not in this group");
}

export async function addSubtask(who: TrackerWho, input: { milestoneId: number } & SubtaskPatch): Promise<SubtaskRow> {
  const groupId = await scopedMilestoneGroup(who, input.milestoneId);
  await checkAssignee(groupId, input.assigneeId);
  const db = await getDb();
  const dueOn = cleanDate(input.dueOn, "Due date");
  if (dueOn) {
    const [milestone] = await db.select({ number: milestones.number, dueOn: milestones.dueOn }).from(milestones).where(eq(milestones.id, input.milestoneId));
    checkTaskDue(milestone, dueOn);
  }
  const [row] = await db
    .insert(subtasks)
    .values({
      milestoneId: input.milestoneId,
      title: clean(input.title, "Title", 200),
      status: input.status ? oneOf(SUBTASK_STATUSES, input.status, "Status") : "todo",
      dueOn,
      assigneeId: null,
      ...assigneeColumns(input),
      updatedBy: who.name,
      // Last, so a value that fails its check above doesn't use up a number.
      number: await nextNumber(groupId, "task"),
    })
    .returning();
  return row!;
}

export async function updateSubtask(who: TrackerWho, id: number, patch: SubtaskPatch): Promise<SubtaskRow> {
  const db = await getDb();
  const [cur] = await db.select().from(subtasks).where(eq(subtasks.id, id));
  ensure(cur, "Subtask not found");
  const groupId = await scopedMilestoneGroup(who, cur.milestoneId, "Subtask");
  await checkAssignee(groupId, patch.assigneeId);
  const dueOn = patch.dueOn !== undefined ? cleanDate(patch.dueOn, "Due date") : undefined;
  if (dueOn) {
    // Only a due date being set is checked: editing something else on an older task never fails on its date.
    const [milestone] = await db.select({ number: milestones.number, dueOn: milestones.dueOn }).from(milestones).where(eq(milestones.id, cur.milestoneId));
    checkTaskDue(milestone, dueOn);
  }
  const [row] = await db
    .update(subtasks)
    .set({
      ...(patch.title !== undefined ? { title: clean(patch.title, "Title", 200) } : {}),
      ...(patch.status !== undefined ? { status: oneOf(SUBTASK_STATUSES, patch.status, "Status") } : {}),
      // A new due date gets its own "within a week" and "overdue" alerts.
      ...(dueOn !== undefined ? { dueOn, ...(dueOn !== cur.dueOn ? { remindedWeekAt: null, remindedOverdueAt: null } : {}) } : {}),
      ...assigneeColumns(patch),
      updatedAt: new Date().toISOString(),
      updatedBy: who.name,
    })
    .where(eq(subtasks.id, id))
    .returning();
  return row!;
}

export interface Assignment {
  task: SubtaskRow;
  /** Who it is assigned to now; "" when unassigned */
  assignee: string;
  /** False when the name isn't on the member list and was kept as typed */
  onList: boolean;
}

/**
 * /assign: sets a task's assignee from a name. An exact or unique whole-word match on the member
 * list assigns that member; a name that matches nobody is kept as typed; one that matches
 * several members is refused. "me" is the sender's Telegram name; null clears.
 */
export async function assignSubtask(who: TrackerWho, id: number, name: string | null): Promise<Assignment> {
  if (name === null) return { task: await updateSubtask(who, id, { assigneeId: null }), assignee: "", onList: true };
  const typed = /^me$/i.test(name.trim()) ? who.name : name.trim();
  const db = await getDb();
  const [cur] = await db.select({ milestoneId: subtasks.milestoneId }).from(subtasks).where(eq(subtasks.id, id));
  ensure(cur, "Subtask not found");
  const groupId = await scopedMilestoneGroup(who, cur.milestoneId, "Subtask");
  const roster = await db.select().from(projectMembers).where(eq(projectMembers.groupId, groupId));
  // Whole words only: "mia" or "lim" finds "Mia Lim", but "jay" never finds "Jayden", because a name
  // that matches nobody is kept as typed and a partial match would quietly take it.
  const words = (name: string) => name.toLowerCase().split(/\s+/).filter(Boolean);
  const q = words(typed);
  const exact = roster.filter((m) => words(m.name).join(" ") === q.join(" "));
  const hits = exact.length ? exact : roster.filter((m) => q.every((w) => words(m.name).includes(w)));
  ensure(hits.length <= 1, `More than one member matches "${typed}": ${hits.map((m) => m.name).join(", ")}`);
  if (hits.length) return { task: await updateSubtask(who, id, { assigneeId: hits[0].id }), assignee: hits[0].name, onList: true };
  return { task: await updateSubtask(who, id, { assigneeName: typed }), assignee: typed, onList: false };
}

export async function deleteSubtask(who: TrackerWho, id: number) {
  const db = await getDb();
  const [cur] = await db.select({ milestoneId: subtasks.milestoneId }).from(subtasks).where(eq(subtasks.id, id));
  ensure(cur, "Subtask not found");
  await scopedMilestoneGroup(who, cur.milestoneId, "Subtask");
  await db.delete(subtasks).where(eq(subtasks.id, id));
}

export async function addBlocker(who: TrackerWho, input: { milestoneId: number; description: string }): Promise<BlockerRow> {
  const groupId = await scopedMilestoneGroup(who, input.milestoneId);
  const description = clean(input.description, "Description", 500);
  const db = await getDb();
  const [row] = await db
    .insert(blockers)
    .values({ milestoneId: input.milestoneId, number: await nextNumber(groupId, "blocker"), description, updatedBy: who.name })
    .returning();
  return row!;
}

export async function updateBlocker(who: TrackerWho, id: number, patch: { description?: string; status?: BlockerStatus }): Promise<BlockerRow> {
  const db = await getDb();
  const [cur] = await db.select().from(blockers).where(eq(blockers.id, id));
  ensure(cur, "Blocker not found");
  await scopedMilestoneGroup(who, cur.milestoneId, "Blocker");
  const status = patch.status !== undefined ? oneOf(BLOCKER_STATUSES, patch.status, "Status") : undefined;
  const [row] = await db
    .update(blockers)
    .set({
      ...(patch.description !== undefined ? { description: clean(patch.description, "Description", 500) } : {}),
      ...(status ? { status, resolvedAt: status === "resolved" ? new Date().toISOString() : null } : {}),
      updatedBy: who.name,
    })
    .where(eq(blockers.id, id))
    .returning();
  return row!;
}

export async function deleteBlocker(who: TrackerWho, id: number) {
  const db = await getDb();
  const [cur] = await db.select({ milestoneId: blockers.milestoneId }).from(blockers).where(eq(blockers.id, id));
  ensure(cur, "Blocker not found");
  await scopedMilestoneGroup(who, cur.milestoneId, "Blocker");
  await db.delete(blockers).where(eq(blockers.id, id));
}

// ── Meetings and reminders ───────────────────────────────────────────────

/**
 * /meeting: a group logs that it met its mentors. Only the latest date is kept.
 * Members can't set a date earlier than the stored one (an admin corrects that),
 * and nobody can log the future. Logging restarts the reminder cycle.
 */
export async function logMeeting(who: TrackerWho, groupId: number, at: Date = new Date()): Promise<ProjectGroup> {
  ensure(inScope(who, groupId), "Group not found");
  ensure(!Number.isNaN(at.getTime()), "Meeting date is not valid");
  ensure(at.getTime() <= Date.now() + 60_000, "A meeting can't be logged in the future");
  const db = await getDb();
  const [group] = await db.select().from(projectGroups).where(eq(projectGroups.id, groupId));
  ensure(group, "Group not found");
  ensure(
    who.admin || !group.lastMeetingAt || at.getTime() >= new Date(group.lastMeetingAt).getTime(),
    "That is earlier than the last logged meeting. Ask a DAP exco to correct it."
  );
  const [row] = await db
    .update(projectGroups)
    .set({ lastMeetingAt: at.toISOString(), meetingRemindedAt: null })
    .where(eq(projectGroups.id, groupId))
    .returning();
  return row!;
}

const DAY = 86_400_000;

/** The meeting clock starts at the last logged meeting, or when the group was created. */
export const meetingBaseline = (g: Pick<ProjectGroup, "lastMeetingAt" | "createdAt">) => new Date(g.lastMeetingAt ?? g.createdAt);

/** The date the next meeting must happen by. */
export const meetingDeadline = (g: Pick<ProjectGroup, "lastMeetingAt" | "createdAt">) =>
  new Date(meetingBaseline(g).getTime() + MEETING_DEADLINE_DAYS * DAY);

/** A reminder is due 3 weeks after the baseline, once per cycle, unless an admin switched it off. */
export function reminderDue(
  g: Pick<ProjectGroup, "lastMeetingAt" | "createdAt" | "meetingRemindersOn" | "meetingRemindedAt" | "telegramChatId">,
  now: Date = new Date()
) {
  return (
    g.meetingRemindersOn &&
    g.telegramChatId != null &&
    g.meetingRemindedAt == null &&
    meetingBaseline(g).getTime() + MEETING_REMIND_DAYS * DAY <= now.getTime()
  );
}

/** Groups to remind now: connected, reminders on, not in an archived cohort. */
export async function dueMeetingReminders(now: Date = new Date()): Promise<ProjectGroup[]> {
  const db = await getDb();
  const rows = await db
    .select({ g: projectGroups })
    .from(projectGroups)
    .innerJoin(cohorts, eq(cohorts.id, projectGroups.cohortId))
    .where(
      and(
        ne(cohorts.visibility, "archived"),
        eq(projectGroups.meetingRemindersOn, true),
        isNotNull(projectGroups.telegramChatId),
        isNull(projectGroups.meetingRemindedAt)
      )
    );
  return rows.map((r) => r.g).filter((g) => reminderDue(g, now));
}

/** Marks a group as reminded; false when another run already did, so a reminder is never sent twice. */
export async function claimMeetingReminder(groupId: number, now: Date = new Date()): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .update(projectGroups)
    .set({ meetingRemindedAt: now.toISOString() })
    .where(and(eq(projectGroups.id, groupId), isNull(projectGroups.meetingRemindedAt)))
    .returning({ id: projectGroups.id });
  return rows.length > 0;
}

/** Undo a claim when the send failed, so the next cron run tries again. */
export async function releaseMeetingReminder(groupId: number) {
  const db = await getDb();
  await db.update(projectGroups).set({ meetingRemindedAt: null }).where(eq(projectGroups.id, groupId));
}

// ── Task deadline alerts ─────────────────────────────────────────────────

/** A task is alerted once when its deadline is this many days away or less. */
export const TASK_ALERT_DAYS = 7;

export interface TaskAlert {
  task: SubtaskRow;
  milestone: { number: number; title: string };
}

export interface GroupTaskAlerts {
  group: ProjectGroup;
  /** Due within a week (today included), not alerted yet */
  soon: TaskAlert[];
  /** Due date has passed, not alerted yet */
  overdue: TaskAlert[];
}

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

/**
 * The tasks to alert about today (a Singapore date, YYYY-MM-DD), grouped by project group: tasks not done,
 * in a connected group with reminders on and a cohort that isn't archived. A task never alerted that is
 * already overdue gets only the overdue alert.
 */
export async function dueTaskAlerts(today: string): Promise<GroupTaskAlerts[]> {
  const db = await getDb();
  const rows = await db
    .select({ task: subtasks, milestone: { number: milestones.number, title: milestones.title }, group: projectGroups })
    .from(subtasks)
    .innerJoin(milestones, eq(milestones.id, subtasks.milestoneId))
    .innerJoin(projectGroups, eq(projectGroups.id, milestones.groupId))
    .innerJoin(cohorts, eq(cohorts.id, projectGroups.cohortId))
    .where(
      and(
        ne(cohorts.visibility, "archived"),
        eq(projectGroups.meetingRemindersOn, true),
        isNotNull(projectGroups.telegramChatId),
        ne(subtasks.status, "done"),
        isNotNull(subtasks.dueOn),
        lte(subtasks.dueOn, addDays(today, TASK_ALERT_DAYS)),
        or(isNull(subtasks.remindedWeekAt), isNull(subtasks.remindedOverdueAt))
      )
    )
    .orderBy(asc(projectGroups.number), asc(subtasks.dueOn), asc(subtasks.number));
  const byGroup = new Map<number, GroupTaskAlerts>();
  for (const r of rows) {
    const due = r.task.dueOn!;
    const kind = due < today ? (r.task.remindedOverdueAt == null ? "overdue" : null) : r.task.remindedWeekAt == null ? "soon" : null;
    if (!kind) continue;
    const entry = byGroup.get(r.group.id) ?? { group: r.group, soon: [], overdue: [] };
    entry[kind].push({ task: r.task, milestone: r.milestone });
    byGroup.set(r.group.id, entry);
  }
  return [...byGroup.values()];
}

/**
 * Marks tasks as alerted and returns the ones this run got, so an alert is never sent twice even if two runs
 * overlap. An overdue alert also covers the "within a week" one, which no longer applies.
 */
export async function claimTaskAlerts(kind: "soon" | "overdue", ids: number[], now: Date = new Date()): Promise<number[]> {
  if (!ids.length) return [];
  const db = await getDb();
  const at = now.toISOString();
  const rows =
    kind === "soon"
      ? await db.update(subtasks).set({ remindedWeekAt: at }).where(and(inArray(subtasks.id, ids), isNull(subtasks.remindedWeekAt))).returning({ id: subtasks.id })
      : await db
          .update(subtasks)
          .set({ remindedOverdueAt: at, remindedWeekAt: sql`coalesce(${subtasks.remindedWeekAt}, ${at}::timestamptz)` })
          .where(and(inArray(subtasks.id, ids), isNull(subtasks.remindedOverdueAt)))
          .returning({ id: subtasks.id });
  return rows.map((r) => r.id);
}

/** Undo a claim when the send failed, so the next run tries again. */
export async function releaseTaskAlerts(kind: "soon" | "overdue", ids: number[]) {
  if (!ids.length) return;
  const db = await getDb();
  await db.update(subtasks).set(kind === "soon" ? { remindedWeekAt: null } : { remindedOverdueAt: null }).where(inArray(subtasks.id, ids));
}
