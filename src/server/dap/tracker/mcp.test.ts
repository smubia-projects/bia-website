import "@tests/helpers/db";
import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { getDb } from "@/server/db";
import { cohorts } from "@/server/db/schema";
import { CmsError, type Actor } from "@/server/core/actor";
import { sgtDay, todaySgt } from "@/shared/time";
import * as t from "./service";
import * as mcp from "./mcp";

const rejects = (p: Promise<unknown>, re: RegExp) => assert.rejects(p, (e) => e instanceof CmsError && re.test(e.message));
const dapExco: Actor = { email: "dana@smu.edu.sg", name: "Dana", role: "dap_exco" };
const lodgeExco: Actor = { email: "lena@smu.edu.sg", name: "Lena", role: "lodge_exco" };

let g1: t.ProjectGroup;
let g2: t.ProjectGroup;
let other: t.ProjectGroup;

before(async () => {
  const db = await getDb();
  await db.insert(cohorts).values([
    { id: "dap-now", programme: "DAP", slug: "ay2627", name: "AY26/27", visibility: "live" },
    { id: "dap-old", programme: "DAP", slug: "ay2526", name: "AY25/26", visibility: "archived" },
  ]);
  g1 = await t.saveProjectGroup(dapExco, { cohortId: "dap-now", number: 1, name: "Alpha", mentors: "Dr Tan" });
  g2 = await t.saveProjectGroup(dapExco, { cohortId: "dap-now", number: 2, name: "Beta" });
  other = await t.saveProjectGroup(dapExco, { cohortId: "dap-old", number: 1, name: "Old" });
});

describe("tracker MCP tools", () => {
  it("are for DAP exco and exco admins only", async () => {
    await rejects(mcp.listProjectGroupProgress(lodgeExco), /cannot use the timeline tracker/);
    await rejects(mcp.projectGroupTimeline(lodgeExco, g1.id), /cannot use the timeline tracker/);
    await rejects(mcp.addMilestones(lodgeExco, "dap-now", [{ title: "x", dueOn: "2030-01-01" }]), /cannot use the timeline tracker/);
    await rejects(mcp.logProjectGroupMeeting(lodgeExco, g1.id), /cannot use the timeline tracker/);
    await rejects(mcp.setMeetingReminders(lodgeExco, g1.id, false), /cannot use the timeline tracker/);
  });

  it("add_milestones checks every row before adding any", async () => {
    await rejects(mcp.addMilestones(dapExco, "dap-now", [{ title: "Good", dueOn: "2030-01-01" }, { title: "Bad", dueOn: "2030-02-30" }]), /Milestone 2: dueOn must be a real date/);
    await rejects(mcp.addMilestones(dapExco, "dap-now", [{ title: "Backwards", startsOn: "2030-02-01", dueOn: "2030-01-01" }]), /startsOn must not be after dueOn/);
    await rejects(mcp.addMilestones(dapExco, "dap-now", [{ title: " ", dueOn: "2030-01-01" }]), /a title is required/);
    await rejects(mcp.addMilestones(dapExco, "dap-now", [{ title: "x", dueOn: "2030-01-01" }], [other.id]), /Not project groups of this cohort/);
    await rejects(mcp.addMilestones(dapExco, "nope", [{ title: "x", dueOn: "2030-01-01" }]), /No DAP cohort "nope"/);
    assert.equal((await t.getTimeline(t.adminWho(dapExco), g1.id)).length, 0);
  });

  it("add_milestones adds the same milestones to every project group, or the ones given", async () => {
    const all = await mcp.addMilestones(dapExco, "dap-now", [
      { title: "Proposal", dueOn: "2020-01-15" },
      { title: "Prototype", startsOn: "2030-01-01", dueOn: "2030-02-01" },
    ]);
    assert.equal(all.added.length, 4);
    assert.deepEqual([...new Set(all.added.map((a) => a.projectGroupId))].sort(), [g1.id, g2.id].sort());
    const one = await mcp.addMilestones(dapExco, "dap-now", [{ title: "Demo", dueOn: "2030-03-01" }], [g2.id]);
    assert.deepEqual(one.added.map((a) => a.projectGroupId), [g2.id]);
    assert.equal((await t.getTimeline(t.adminWho(dapExco), other.id)).length, 0); // the other cohort is untouched
  });

  it("list_project_groups defaults to the current cohort and reports progress", async () => {
    const proposal = (await t.getTimeline(t.adminWho(dapExco), g1.id)).find((m) => m.title === "Proposal")!;
    await t.addBlocker(t.adminWho(dapExco), { milestoneId: proposal.id, description: "Waiting on data" });
    const { cohortId, projectGroups } = await mcp.listProjectGroupProgress(dapExco);
    assert.equal(cohortId, "dap-now");
    const alpha = projectGroups.find((g) => g.id === g1.id)!;
    assert.deepEqual(
      [alpha.milestonesDone, alpha.milestonesTotal, alpha.overdueMilestones, alpha.openBlockers, alpha.lastMeeting, alpha.chatConnected],
      [0, 2, 1, 1, null, false]
    );
    assert.equal(projectGroups.find((g) => g.id === g2.id)!.milestonesTotal, 3);
    assert.equal((await mcp.listProjectGroupProgress(dapExco, "dap-old")).projectGroups[0].id, other.id);
  });

  it("set_milestone_status, then the timeline shows it with tasks, typed assignees and blockers", async () => {
    const [first] = await t.getTimeline(t.adminWho(dapExco), g1.id);
    assert.equal((await mcp.setMilestoneStatus(dapExco, first.id, "done")).status, "done");
    await rejects(mcp.setMilestoneStatus(dapExco, first.id, "finished" as never), /one of/);
    const member = await t.saveMember(dapExco, { groupId: g1.id, name: "Mia Lim" });
    const who = t.adminWho(dapExco);
    await t.addSubtask(who, { milestoneId: first.id, title: "Draft deck", assigneeId: member.id });
    await t.addSubtask(who, { milestoneId: first.id, title: "Book room", assigneeName: "Jay" });

    const timeline = await mcp.projectGroupTimeline(dapExco, g1.id);
    assert.equal(timeline.projectGroup.number, 1);
    const m = timeline.milestones.find((x) => x.id === first.id)!;
    assert.deepEqual([m.status, m.overdue], ["done", false]);
    assert.deepEqual(
      m.tasks.map((x) => [x.title, x.assignee, x.assigneeOnMemberList]),
      [["Draft deck", "Mia Lim", true], ["Book room", "Jay", false]]
    );
    assert.equal(m.blockers[0].description, "Waiting on data");
    await rejects(mcp.projectGroupTimeline(dapExco, 99_999), /not found/);
  });

  it("logs a meeting (now, or a past date) and switches reminders", async () => {
    const now = await mcp.logProjectGroupMeeting(dapExco, g1.id);
    assert.equal(now.lastMeeting, todaySgt());
    const past = await mcp.logProjectGroupMeeting(dapExco, g1.id, "2026-01-05");
    assert.equal(past.lastMeeting, "2026-01-05");
    assert.equal(past.nextMeetingBy, sgtDay(t.meetingDeadline({ lastMeetingAt: "2026-01-05T04:00:00.000Z", createdAt: "" })));
    await rejects(mcp.logProjectGroupMeeting(dapExco, g1.id, "2026-13-01"), /real date/);
    await rejects(mcp.logProjectGroupMeeting(dapExco, g1.id, "2099-01-01"), /future/);
    assert.equal((await mcp.setMeetingReminders(dapExco, g2.id, false)).meetingRemindersOn, false);
  });
});
