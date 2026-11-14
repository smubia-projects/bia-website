import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildChart, summarise, type GroupTimeline } from "./tracker-view";
import type { MilestoneDetail, ProjectGroup } from "./tracker";

const group = (id: number, extra: Partial<ProjectGroup> = {}): ProjectGroup => ({
  id, cohortId: "c", number: id, name: `G${id}`, mentors: "", telegramChatId: null, lastMeetingAt: null,
  meetingRemindersOn: true, meetingRemindedAt: null, createdAt: "2026-10-01T00:00:00Z", ...extra,
});
let nextId = 1;
const ms = (groupId: number, startsOn: string | null, dueOn: string, extra: Partial<MilestoneDetail> = {}): MilestoneDetail => ({
  id: nextId++, groupId, title: `M${nextId}`, notes: "", startsOn, dueOn, status: "todo", createdAt: "", updatedAt: "", updatedBy: "",
  subtasks: [], blockers: [], ...extra,
});
const today = "2026-11-13"; // a Friday

describe("buildChart", () => {
  it("is null with no milestones", () => {
    assert.equal(buildChart([{ group: group(1), milestones: [] }], today), null);
  });

  it("starts on a Monday, covers today and every due date, and places bars inside 0–100%", () => {
    const data: GroupTimeline[] = [{ group: group(1), milestones: [ms(1, "2026-11-20", "2026-12-04"), ms(1, null, "2026-12-30")] }];
    const c = buildChart(data, today)!;
    assert.equal(new Date(c.start + "T00:00:00Z").getUTCDay(), 1);
    assert.ok(c.start <= today && c.end >= "2026-12-30");
    for (const b of c.lanes[0].bars) assert.ok(b.startPct >= 0 && b.endPct <= 100 && b.startPct < b.endPct, JSON.stringify(b));
    assert.ok(c.todayPct > 0 && c.todayPct < 100);
    assert.equal(c.lanes[0].bars[1].point, true);
  });

  it("stacks overlapping milestones into rows and reuses a row once it is free", () => {
    const data: GroupTimeline[] = [{
      group: group(1),
      milestones: [ms(1, "2026-11-16", "2026-12-14"), ms(1, "2026-11-23", "2026-12-07"), ms(1, "2026-12-21", "2026-12-28")],
    }];
    const bars = buildChart(data, today)!.lanes[0].bars;
    assert.deepEqual(bars.map((b) => b.row), [0, 1, 0]);
    assert.equal(buildChart(data, today)!.lanes[0].rows, 2);
  });

  it("flags overdue (not done) and counts blockers and tasks", () => {
    const late = ms(1, null, "2026-11-01", { subtasks: [{ status: "done" }, { status: "todo" }] as never, blockers: [{ status: "open" }, { status: "resolved" }] as never });
    const doneLate = ms(1, null, "2026-11-02", { status: "done" });
    const [a, b] = buildChart([{ group: group(1), milestones: [late, doneLate] }], today)!.lanes[0].bars;
    assert.deepEqual([a.overdue, a.openBlockers, a.tasksDone, a.tasks, b.overdue], [true, 1, 1, 2, false]);
  });
});

describe("summarise", () => {
  it("totals across groups, and counts groups past their meeting deadline", () => {
    const now = new Date("2026-11-13T00:00:00Z");
    const data: GroupTimeline[] = [
      { group: group(1, { telegramChatId: -1, lastMeetingAt: "2026-11-10T00:00:00Z" }), milestones: [ms(1, null, "2026-11-01"), ms(1, null, "2026-12-01", { status: "done" })] },
      { group: group(2, { lastMeetingAt: "2026-09-01T00:00:00Z" }), milestones: [] },
    ];
    assert.deepEqual(summarise(data, today, now), {
      groups: 2, chatsRegistered: 1, milestones: 2, milestonesDone: 1, overdue: 1, openBlockers: 0, meetingsOverdue: 1,
    });
  });
});
