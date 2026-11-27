import "@tests/helpers/db";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { cohorts, people, projectGroups } from "@/server/db/schema";
import { CmsError, type Actor } from "@/server/core/actor";
import * as t from "./service";

const rejects = (p: Promise<unknown>, re?: RegExp) => assert.rejects(p, (e) => e instanceof CmsError && (!re || re.test(e.message)));
const DAY = 86_400_000;
const actor = (role: Actor["role"], name: string = role): Actor => ({ email: `${name}@smu.edu.sg`, name, role });

let cohortId = "";
let g1: t.ProjectGroup;
let g2: t.ProjectGroup;
const dapExco = actor("dap_exco", "dana");

before(async () => {
  const db = await getDb();
  cohortId = "dap-test";
  await db.insert(cohorts).values({ id: cohortId, programme: "DAP", slug: "ay2627", name: "AY26/27", visibility: "live" });
  await db.insert(people).values([
    { email: "dana@smu.edu.sg", name: "dana", role: "dap_exco", telegramUserId: 111 },
    { email: "lodge_exco@smu.edu.sg", name: "lodge", role: "lodge_exco", telegramUserId: 222 },
    { email: "gone@smu.edu.sg", name: "gone", role: "dap_exco", telegramUserId: 333, accessEnds: "2020-01-01" },
  ]);
  g1 = await t.saveProjectGroup(dapExco, { cohortId, number: 1, name: "Alpha" });
  g2 = await t.saveProjectGroup(dapExco, { cohortId, number: 2, name: "Beta" });
});

after(async () => {
  const db = await getDb();
  await db.delete(cohorts).where(eq(cohorts.id, cohortId));
});

describe("chat connection and sender resolution", () => {
  it("connects only group chats, one chat per group, moving a chat between groups", async () => {
    await rejects(t.connectChat(g1.id, 555), /group chat/);
    await rejects(t.connectChat(99_999, -100), /not found/);
    assert.equal((await t.connectChat(g1.id, -1001)).telegramChatId, -1001);
    assert.equal((await t.connectChat(g1.id, -1002)).telegramChatId, -1002); // chat replaced
    await t.connectChat(g2.id, -1002); // moves to group 2
    await t.connectChat(g1.id, -1001);
    await t.connectChat(g2.id, -2002);
  });

  it("admin by stored Telegram ID, member by connected chat, everyone else null", async () => {
    const admin = await t.resolveSender(-9999, 111, "Dana");
    assert.ok(admin?.who.admin && admin.group === null); // admin works even in a chat that is not connected
    assert.equal(await t.resolveSender(-9999, 444, "Stranger"), null); // chat that is not connected
    assert.equal(await t.resolveSender(444, 444, "Stranger"), null); // private chat
    const member = await t.resolveSender(-1001, 444, "Mia");
    assert.deepEqual(member?.who, { admin: false, groupId: g1.id, name: "Mia" });
    assert.equal((await t.resolveSender(-1001, 222, "Lodge"))?.who.admin, false); // wrong role is only a member
    assert.equal(await t.resolveSender(-9999, 222, "Lodge"), null);
    assert.equal((await t.resolveSender(-1001, 333, "Gone"))?.who.admin, false); // access ended
  });
});

describe("timeline permissions and scoping", () => {
  let m1: number;
  let m2: number;
  const mem1 = () => t.memberWho(g1.id, "Mia");

  before(async () => {
    m1 = (await t.saveMilestone(dapExco, { groupId: g1.id, title: "Proposal", dueOn: "2026-12-01" })).id;
    m2 = (await t.saveMilestone(dapExco, { groupId: g2.id, title: "Other", dueOn: "2026-12-02" })).id;
  });

  it("milestones: admins write, members only read their own group", async () => {
    await rejects(t.saveMilestone(actor("lodge_exco"), { groupId: g1.id, title: "x", dueOn: "2026-12-01" }), /cannot use/);
    await rejects(t.saveMilestone(dapExco, { groupId: g1.id, title: "x", dueOn: "2026-02-30" }), /real date/);
    await rejects(t.saveMilestone(dapExco, { groupId: g1.id, title: "x", startsOn: "2026-12-05", dueOn: "2026-12-01" }), /not be after/);
    assert.equal((await t.getTimeline(mem1(), g1.id)).length, 1);
    await rejects(t.getTimeline(mem1(), g2.id), /not found/);
    await rejects(t.getMilestone(mem1(), m2), /not found/);
    assert.equal((await t.getMilestone(mem1(), m1)).title, "Proposal");
    assert.equal((await t.setMilestoneStatus(dapExco, m1, "in_progress")).status, "in_progress");
    await rejects(t.saveMilestone(dapExco, { groupId: g1.id, title: "Bad", dueOn: "2030-13-01" }), /real date/);
    // An edit that leaves the start date out is checked against the stored one.
    const dated = await t.saveMilestone(dapExco, { groupId: g1.id, title: "Dated", startsOn: "2030-03-01", dueOn: "2030-03-10" });
    await rejects(t.saveMilestone(dapExco, { id: dated.id, groupId: g1.id, title: "Dated", dueOn: "2030-02-01" }), /Start date must not be after/);
    assert.equal((await t.saveMilestone(dapExco, { id: dated.id, groupId: g1.id, title: "Dated", dueOn: "2030-03-20" })).startsOn, "2030-03-01");
    await t.deleteMilestone(dapExco, dated.id);
    await rejects(t.setMilestoneStatus(dapExco, m1, "finished" as never), /one of/);
  });

  it("subtasks and blockers: members manage their own group's, never another's", async () => {
    const [mia] = [await t.saveMember(dapExco, { groupId: g1.id, name: "Mia" })];
    const other = await t.saveMember(dapExco, { groupId: g2.id, name: "Ben" });
    const s = await t.addSubtask(mem1(), { milestoneId: m1, title: "Draft deck", assigneeId: mia.id });
    await rejects(t.addSubtask(mem1(), { milestoneId: m2, title: "sneaky" }), /not found/);
    await rejects(t.addSubtask(mem1(), { milestoneId: m1, title: "x", assigneeId: other.id }), /not in this group/);
    assert.equal((await t.updateSubtask(mem1(), s.id, { status: "done", assigneeId: null })).assigneeId, null);

    // Assigning by name: a member on the list, else the name as typed; never both.
    await t.saveMember(dapExco, { groupId: g1.id, name: "Mia Tan" });
    await t.saveMember(dapExco, { groupId: g1.id, name: "Jayden Tan" });
    await rejects(t.assignSubtask(mem1(), s.id, "tan"), /More than one member matches "tan": Mia Tan, Jayden Tan/);
    const exact = await t.assignSubtask(mem1(), s.id, "mia"); // the exact name beats a word match
    assert.deepEqual([exact.assignee, exact.onList, exact.task.assigneeId], ["Mia", true, mia.id]);
    assert.equal((await t.assignSubtask(mem1(), s.id, "jayden")).assignee, "Jayden Tan"); // a whole word
    const typed = await t.assignSubtask(mem1(), s.id, "Jay"); // part of a word: not a match, kept as typed
    assert.deepEqual([typed.assignee, typed.onList, typed.task.assigneeId, typed.task.assigneeName], ["Jay", false, null, "Jay"]);
    const me = await t.assignSubtask(t.memberWho(g1.id, "Mia Tan"), s.id, "me");
    assert.deepEqual([me.assignee, me.task.assigneeName], ["Mia Tan", ""]);
    assert.equal((await t.assignSubtask(mem1(), s.id, null)).task.assigneeName, "");
    await rejects(t.updateSubtask(t.memberWho(g2.id, "Ben"), s.id, { title: "hijack" }), /Subtask not found/);
    await rejects(t.deleteSubtask(t.memberWho(g2.id, "Ben"), s.id), /Subtask not found/);

    const b = await t.addBlocker(mem1(), { milestoneId: m1, description: "No data access" });
    const resolved = await t.updateBlocker(mem1(), b.id, { status: "resolved" });
    assert.ok(resolved.resolvedAt);
    assert.equal((await t.updateBlocker(mem1(), b.id, { status: "open" })).resolvedAt, null);
    await rejects(t.deleteBlocker(t.memberWho(g2.id, "Ben"), b.id), /Blocker not found/);

    const detail = await t.getMilestone(t.adminWho(dapExco), m1);
    assert.equal(detail.subtasks.length, 1);
    await t.deleteSubtask(mem1(), s.id);
    await t.deleteBlocker(mem1(), b.id);
    assert.equal((await t.getMilestone(mem1(), m1)).subtasks.length, 0);
  });
});

describe("numbers within a project group", () => {
  it("count per group and kind, are never reused, and find only that group's items", async () => {
    const admin = t.adminWho(dapExco);
    const cohort2 = "dap-numbers";
    await (await getDb()).insert(cohorts).values({ id: cohort2, programme: "DAP", slug: "numbers", name: "Numbers", visibility: "hidden" });
    const a = await t.saveProjectGroup(dapExco, { cohortId: cohort2, number: 1, name: "A" });
    const b = await t.saveProjectGroup(dapExco, { cohortId: cohort2, number: 2, name: "B" });
    const ma = await t.saveMilestone(dapExco, { groupId: a.id, title: "A1", dueOn: "2030-01-01" });
    const mb = await t.saveMilestone(dapExco, { groupId: b.id, title: "B1", dueOn: "2030-01-01" });
    assert.deepEqual([ma.number, mb.number], [1, 1]); // each group starts at M1
    const t1 = await t.addSubtask(admin, { milestoneId: ma.id, title: "one" });
    const t2 = await t.addSubtask(admin, { milestoneId: ma.id, title: "two" });
    const bl = await t.addBlocker(admin, { milestoneId: ma.id, description: "stuck" });
    assert.deepEqual([t1.number, t2.number, bl.number], [1, 2, 1]); // tasks and blockers count separately
    await t.deleteSubtask(admin, t2.id);
    assert.equal((await t.addSubtask(admin, { milestoneId: ma.id, title: "three" })).number, 3); // T2 is not given out again
    await rejects(t.addSubtask(admin, { milestoneId: ma.id, title: "" }), /Title is required/);
    assert.equal((await t.addSubtask(admin, { milestoneId: ma.id, title: "four" })).number, 4); // a rejected task uses no number
    assert.equal(await t.idByNumber(admin, a.id, "task", 1), t1.id);
    assert.equal(await t.idByNumber(admin, b.id, "milestone", 1), mb.id);
    await rejects(t.idByNumber(admin, b.id, "task", 1), /Task T1 not found/); // Group B has no tasks
    await rejects(t.idByNumber(t.memberWho(b.id, "x"), a.id, "task", 1), /Group not found/); // members only reach their own
    await (await getDb()).delete(cohorts).where(eq(cohorts.id, cohort2));
  });
});

describe("meetings and reminders", () => {
  const base = { meetingRemindersOn: true, meetingRemindedAt: null, telegramChatId: -1 };
  const at = (days: number) => new Date(Date.parse("2026-11-01T00:00:00Z") + days * DAY);
  const met = { ...base, lastMeetingAt: at(0).toISOString(), createdAt: at(-90).toISOString() };

  it("reminder is due from day 21, once, unless off or not connected", () => {
    assert.equal(t.reminderDue(met, at(20.9)), false);
    assert.equal(t.reminderDue(met, at(21)), true);
    assert.equal(t.reminderDue({ ...met, meetingRemindedAt: at(21).toISOString() }, at(30)), false);
    assert.equal(t.reminderDue({ ...met, meetingRemindersOn: false }, at(30)), false);
    assert.equal(t.reminderDue({ ...met, telegramChatId: null as never }, at(30)), false);
    assert.equal(t.reminderDue({ ...met, lastMeetingAt: null }, at(-90 + 21)), true); // never met: counts from creation
    assert.equal(t.meetingDeadline(met).getTime(), at(28).getTime());
  });

  it("logging: no future dates; members can't go back; logging restarts the cycle", async () => {
    const mem = t.memberWho(g1.id, "Mia");
    await rejects(t.logMeeting(mem, g1.id, new Date(Date.now() + 2 * DAY)), /future/);
    await rejects(t.logMeeting(mem, g2.id), /not found/);
    const recent = new Date(Date.now() - 2 * DAY);
    await t.logMeeting(mem, g1.id, recent);
    await rejects(t.logMeeting(mem, g1.id, new Date(Date.now() - 5 * DAY)), /earlier/);
    const fixed = await t.logMeeting(t.adminWho(dapExco), g1.id, new Date(Date.now() - 5 * DAY));
    assert.equal(new Date(fixed.lastMeetingAt!).getTime() < recent.getTime(), true);
  });

  it("due list claims once, skips switched-off and archived groups, resets on a new meeting", async () => {
    const db = await getDb();
    const old = new Date(Date.now() - 30 * DAY).toISOString();
    await db.update(projectGroups).set({ lastMeetingAt: old }).where(eq(projectGroups.id, g1.id));
    await db.update(projectGroups).set({ lastMeetingAt: old }).where(eq(projectGroups.id, g2.id));
    await t.setMeetingReminders(dapExco, g2.id, false);
    assert.deepEqual((await t.dueMeetingReminders()).map((g) => g.id), [g1.id]);
    assert.equal(await t.claimMeetingReminder(g1.id), true);
    assert.equal(await t.claimMeetingReminder(g1.id), false); // overlapping cron run
    assert.deepEqual(await t.dueMeetingReminders(), []);
    await t.releaseMeetingReminder(g1.id);
    assert.equal((await t.dueMeetingReminders()).length, 1);
    await t.claimMeetingReminder(g1.id);
    await t.logMeeting(t.memberWho(g1.id, "Mia"), g1.id); // new cycle
    assert.equal((await t.logMeeting(t.adminWho(dapExco), g1.id)).meetingRemindedAt, null);
    await t.setMeetingReminders(dapExco, g2.id, true);
    await db.update(cohorts).set({ visibility: "archived" }).where(eq(cohorts.id, cohortId));
    assert.deepEqual(await t.dueMeetingReminders(), []);
  });
});

describe("task deadlines", () => {
  const who = () => t.adminWho(dapExco);
  const today = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
  const plus = (n: number) => new Date(Date.parse(`${today}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
  let g: t.ProjectGroup;
  let ms: Awaited<ReturnType<typeof t.saveMilestone>>; // due in 30 days

  before(async () => {
    // An earlier test archives the shared cohort; alerts skip archived ones, so start from a live one.
    await (await getDb()).update(cohorts).set({ visibility: "live" }).where(eq(cohorts.id, cohortId));
    g = await t.saveProjectGroup(dapExco, { cohortId, number: 7, name: "Deadlines" });
    await t.connectChat(g.id, -7007);
    ms = await t.saveMilestone(dapExco, { groupId: g.id, title: "Ship", dueOn: plus(30) });
  });

  it("a task can't be due after its milestone, whether it is added or edited", async () => {
    const onTheDay = await t.addSubtask(who(), { milestoneId: ms.id, title: "On the day", dueOn: plus(30) });
    await rejects(t.addSubtask(who(), { milestoneId: ms.id, title: "Late", dueOn: plus(31) }), /A task can't be due after its milestone: M\d+ is due \d+ \w+ \d{4}\./);
    await rejects(t.updateSubtask(who(), onTheDay.id, { dueOn: plus(31) }), /can't be due after its milestone/);
    assert.equal((await t.updateSubtask(who(), onTheDay.id, { dueOn: plus(29) })).dueOn, plus(29));
    assert.equal((await t.updateSubtask(who(), onTheDay.id, { dueOn: null })).dueOn, null); // no deadline is fine
    // A member is held to the same rule.
    await rejects(t.addSubtask(t.memberWho(g.id, "Mia"), { milestoneId: ms.id, title: "Late", dueOn: plus(45) }), /can't be due after/);
    await t.deleteSubtask(who(), onTheDay.id);
  });

  it("an older task already past its milestone only fails when its due date is being set", async () => {
    const task = await t.addSubtask(who(), { milestoneId: ms.id, title: "Older" });
    await (await getDb()).update((await import("@/server/db/schema")).subtasks).set({ dueOn: plus(40) }).where(eq((await import("@/server/db/schema")).subtasks.id, task.id));
    assert.equal((await t.updateSubtask(who(), task.id, { title: "Older, renamed", status: "in_progress" })).title, "Older, renamed");
    await rejects(t.updateSubtask(who(), task.id, { dueOn: plus(40) }), /can't be due after/);
    await t.deleteSubtask(who(), task.id);
  });

  it("a milestone's deadline can't move before a task's", async () => {
    const early = await t.addSubtask(who(), { milestoneId: ms.id, title: "Early", dueOn: plus(20) });
    const mid = await t.addSubtask(who(), { milestoneId: ms.id, title: "Mid", dueOn: plus(25) });
    await rejects(t.saveMilestone(dapExco, { id: ms.id, groupId: g.id, title: "Ship", dueOn: plus(22) }), /T\d+ \(\d+ \w+ \d{4}\) is due after \d+ \w+ \d{4}\. Change its due date first\./);
    await rejects(t.saveMilestone(dapExco, { id: ms.id, groupId: g.id, title: "Ship", dueOn: plus(10) }), /T\d+ \([^)]+\), T\d+ \([^)]+\) are due after[\s\S]*Change their due date first/);
    assert.equal((await t.saveMilestone(dapExco, { id: ms.id, groupId: g.id, title: "Ship", dueOn: plus(25) })).dueOn, plus(25)); // equal is fine
    assert.equal((await t.saveMilestone(dapExco, { id: ms.id, groupId: g.id, title: "Ship it", dueOn: plus(25) })).title, "Ship it");
    assert.equal((await t.saveMilestone(dapExco, { id: ms.id, groupId: g.id, title: "Ship it", dueOn: plus(30) })).dueOn, plus(30)); // later is fine
    await t.deleteSubtask(who(), early.id);
    await t.deleteSubtask(who(), mid.id);
  });

  it("finds the tasks to alert about: due within a week or overdue, not done, once each", async () => {
    const add = (title: string, due: string | null, status?: "done") => t.addSubtask(who(), { milestoneId: ms.id, title, dueOn: due, ...(status ? { status } : {}) });
    const [soon, week, later, late] = [await add("soon", plus(3)), await add("week", plus(7)), await add("later", plus(8)), await add("late", plus(-1))];
    await add("done", plus(2), "done"); // finished tasks are never alerted
    await add("undated", null);
    const mine = async (day: string) => (await t.dueTaskAlerts(day)).find((x) => x.group.id === g.id);
    const nums = (list?: t.TaskAlert[]) => (list ?? []).map((a) => a.task.number);

    let a = await mine(today);
    assert.deepEqual([nums(a?.soon), nums(a?.overdue)], [[soon.number, week.number], [late.number]]);
    assert.equal(a?.soon[0].milestone.number, ms.number);

    // Claiming is once: a second claim of the same tasks gets nothing.
    assert.deepEqual((await t.claimTaskAlerts("soon", [soon.id, week.id])).sort(), [soon.id, week.id].sort());
    assert.deepEqual(await t.claimTaskAlerts("soon", [soon.id, week.id]), []);
    assert.deepEqual(await t.claimTaskAlerts("overdue", [late.id]), [late.id]);
    assert.deepEqual(await t.claimTaskAlerts("overdue", [late.id]), []);
    assert.equal(await mine(today), undefined);

    // Later days bring the next ones: "later" comes within a week, then "soon" passes.
    a = await mine(plus(2));
    assert.deepEqual([nums(a?.soon), nums(a?.overdue)], [[later.number], []]);
    a = await mine(plus(5));
    assert.deepEqual([nums(a?.soon), nums(a?.overdue)], [[later.number], [soon.number]]); // overdue even though only the week alert went out
    // An overdue alert also covers the "within a week" one, so it is never sent after the deadline.
    await t.claimTaskAlerts("overdue", [later.id]);
    assert.deepEqual(nums((await mine(plus(20)))?.overdue), [soon.number, week.number]);

    // A failed send is released; a new deadline starts over; done ends it.
    await t.releaseTaskAlerts("overdue", [later.id]);
    assert.ok(nums((await mine(plus(20)))?.overdue).includes(later.number));
    await t.updateSubtask(who(), soon.id, { dueOn: plus(4) });
    assert.deepEqual(nums((await mine(today))?.soon), [soon.number]);
    await t.updateSubtask(who(), soon.id, { status: "done" });
    assert.equal((await mine(today))?.soon.length ?? 0, 0);
  });

  it("skips groups with reminders off, no connected chat, or an archived cohort", async () => {
    const quiet = await t.saveProjectGroup(dapExco, { cohortId, number: 8, name: "No chat" });
    const m2 = await t.saveMilestone(dapExco, { groupId: quiet.id, title: "M", dueOn: plus(30) });
    await t.addSubtask(who(), { milestoneId: m2.id, title: "Never alerted", dueOn: plus(-3) });
    const has = async (id: number) => (await t.dueTaskAlerts(today)).some((x) => x.group.id === id);
    assert.equal(await has(quiet.id), false); // not connected
    await t.connectChat(quiet.id, -8008);
    assert.equal(await has(quiet.id), true);
    await t.setMeetingReminders(dapExco, quiet.id, false);
    assert.equal(await has(quiet.id), false);
    await t.setMeetingReminders(dapExco, quiet.id, true);
    const db = await getDb();
    await db.update(cohorts).set({ visibility: "archived" }).where(eq(cohorts.id, cohortId));
    assert.equal(await has(quiet.id), false);
    await db.update(cohorts).set({ visibility: "live" }).where(eq(cohorts.id, cohortId));
  });
});
