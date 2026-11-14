import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

// Throwaway embedded database: never touch .data/pglite. Set before the first getDb().
process.env.PGLITE_DIR = path.join(mkdtempSync(path.join(tmpdir(), "tracker-")), "db");

import { eq } from "drizzle-orm";
import { getDb } from "@/app/lib/db";
import { cohorts, people, projectGroups } from "@/app/lib/db/schema";
import { CmsError, type Actor } from "./actor";
import * as t from "./tracker";

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

describe("chat registration and sender resolution", () => {
  it("only admins register, only group chats, one chat per group", async () => {
    await rejects(t.registerChat(actor("lodge_exco"), -100, 1), /cannot use/);
    await rejects(t.registerChat(dapExco, 555, 1), /group chat/);
    await rejects(t.registerChat(dapExco, -100, 99), /does not exist/);
    assert.equal((await t.registerChat(dapExco, -1001, 1)).telegramChatId, -1001);
    await rejects(t.registerChat(dapExco, -1001, 2), /already registered to Group 1/);
    assert.equal((await t.registerChat(dapExco, -1002, 1)).telegramChatId, -1002); // chat replaced
    await t.registerChat(dapExco, -1001, 1);
    await t.registerChat(dapExco, -2002, 2);
  });

  it("admin by stored Telegram ID, member by registered chat, everyone else null", async () => {
    const admin = await t.resolveSender(-9999, 111, "Dana");
    assert.ok(admin?.who.admin && admin.group === null); // admin works even in an unregistered chat
    assert.equal(await t.resolveSender(-9999, 444, "Stranger"), null); // unregistered chat
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
    await rejects(t.setMilestoneStatus(dapExco, m1, "finished" as never), /one of/);
  });

  it("subtasks and blockers: members manage their own group's, never another's", async () => {
    const [mia] = [await t.saveMember(dapExco, { groupId: g1.id, name: "Mia" })];
    const other = await t.saveMember(dapExco, { groupId: g2.id, name: "Ben" });
    const s = await t.addSubtask(mem1(), { milestoneId: m1, title: "Draft deck", assigneeId: mia.id });
    await rejects(t.addSubtask(mem1(), { milestoneId: m2, title: "sneaky" }), /not found/);
    await rejects(t.addSubtask(mem1(), { milestoneId: m1, title: "x", assigneeId: other.id }), /not in this group/);
    assert.equal((await t.updateSubtask(mem1(), s.id, { status: "done", assigneeId: null })).assigneeId, null);
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

describe("meetings and reminders", () => {
  const base = { meetingRemindersOn: true, meetingRemindedAt: null, telegramChatId: -1 };
  const at = (days: number) => new Date(Date.parse("2026-11-01T00:00:00Z") + days * DAY);
  const met = { ...base, lastMeetingAt: at(0).toISOString(), createdAt: at(-90).toISOString() };

  it("reminder is due from day 21, once, unless off or unregistered", () => {
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
