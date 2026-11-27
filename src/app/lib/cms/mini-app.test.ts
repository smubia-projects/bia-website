import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { before, beforeEach, describe, it } from "node:test";

process.env.PGLITE_DIR = path.join(mkdtempSync(path.join(tmpdir(), "miniapp-")), "db");

import type { Api } from "grammy";
import { getDb } from "@/app/lib/db";
import { cohorts, people } from "@/app/lib/db/schema";
import { clearMembershipCache, handleAction, handleSession, handleTimeline, MAX_AGE_SECONDS, resolveAccess, validateInitData, type Launch } from "./mini-app";
import * as t from "./tracker";

const TOKEN = "123456:TEST-TOKEN";
const NOW = Date.now();
const MINGDA = { id: 111, first_name: "Mingda", last_name: "Chen", username: "mingda" };
const MIA = { id: 2001, first_name: "Mia" };
const BEN = { id: 2002, first_name: "Ben" };
const admin = { email: "mingda@smu.edu.sg", name: "Mingda", role: "dap_exco" as const };

/** What Telegram's own client would hand the app: fields, signed with the bot token. */
function sign(fields: Record<string, string>, token = TOKEN) {
  const params = new URLSearchParams(fields);
  const check = [...params.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join("\n");
  params.set("hash", createHmac("sha256", createHmac("sha256", "WebAppData").update(token).digest()).update(check).digest("hex"));
  return params.toString();
}
const launchData = (user: object, extra: Record<string, string> = {}, ageSeconds = 0) =>
  sign({ auth_date: String(Math.floor(NOW / 1000) - ageSeconds), query_id: "AAH", user: JSON.stringify(user), ...extra });

/** A Telegram that answers getChatMember from a table and counts the questions. */
function telegram(table: Record<string, string | { status: string; is_member?: boolean } | Error>) {
  const asked: string[] = [];
  const api = {
    getChatMember: async (chatId: number, userId: number) => {
      asked.push(`${chatId}:${userId}`);
      const a = table[`${chatId}:${userId}`] ?? { status: "left" };
      if (a instanceof Error) throw a;
      return typeof a === "string" ? { status: a, user: { id: userId } } : { ...a, user: { id: userId } };
    },
  } as unknown as Api;
  return { api, asked };
}

const request = (path: string, initData?: string) => new Request(`https://x.test${path}`, { headers: initData ? { authorization: `tma ${initData}` } : {} });
const rejects = (fn: () => unknown, re: RegExp) => assert.throws(fn, (e) => e instanceof Error && re.test(e.message));

describe("validateInitData", () => {
  it("accepts what Telegram signed, and reads who opened the app and from where", () => {
    const l = validateInitData(launchData(MINGDA, { start_param: "g3", chat_type: "supergroup", chat_instance: "-123" }), TOKEN, NOW);
    assert.deepEqual(l.user, { id: 111, name: "Mingda Chen", username: "mingda" });
    assert.deepEqual([l.startParam, l.chatType], ["g3", "supergroup"]);
    assert.equal(validateInitData(launchData(MIA), TOKEN, NOW).user.name, "Mia");
  });

  it("refuses anything forged, re-signed with another token, unsigned or tampered with", () => {
    const good = launchData(MIA);
    rejects(() => validateInitData(good, "999:OTHER", NOW), /could not be verified/);
    rejects(() => validateInitData(good.replace("2001", "111"), TOKEN, NOW), /could not be verified/); // someone else's ID
    rejects(() => validateInitData(good.replace(/hash=[0-9a-f]+/, "hash=" + "0".repeat(64)), TOKEN, NOW), /could not be verified/);
    rejects(() => validateInitData(good.replace(/&hash=[0-9a-f]+/, ""), TOKEN, NOW), /could not be verified/); // no hash
    rejects(() => validateInitData(good.replace(/hash=[0-9a-f]+/, "hash=short"), TOKEN, NOW), /could not be verified/);
    rejects(() => validateInitData("", TOKEN, NOW), /could not be verified/);
    rejects(() => validateInitData(good, "", NOW), /not configured/);
    // Adding a field after signing (a start_param that names another group) breaks the signature too.
    rejects(() => validateInitData(`${good}&start_param=g9`, TOKEN, NOW), /could not be verified/);
  });

  it("refuses a launch that is too old or from the future, and malformed users", () => {
    rejects(() => validateInitData(launchData(MIA, {}, MAX_AGE_SECONDS + 60), TOKEN, NOW), /expired/);
    assert.equal(validateInitData(launchData(MIA, {}, MAX_AGE_SECONDS - 60), TOKEN, NOW).user.id, 2001);
    rejects(() => validateInitData(launchData(MIA, {}, -600), TOKEN, NOW), /could not be verified/); // 10 minutes ahead
    assert.equal(validateInitData(launchData(MIA, {}, -60), TOKEN, NOW).user.id, 2001); // a minute of clock skew is fine
    rejects(() => validateInitData(sign({ auth_date: String(Math.floor(NOW / 1000)), user: "not json" }), TOKEN, NOW), /could not be verified/);
    rejects(() => validateInitData(sign({ auth_date: String(Math.floor(NOW / 1000)), user: JSON.stringify({ id: "1" }) }), TOKEN, NOW), /could not be verified/);
    rejects(() => validateInitData(sign({ auth_date: "soon", user: JSON.stringify(MIA) }), TOKEN, NOW), /could not be verified/);
  });
});

describe("who may open which project group", () => {
  let g1: t.ProjectGroup;
  let g2: t.ProjectGroup;
  const as = (user: { id: number; first_name: string }, startParam = ""): Launch => ({ user: { id: user.id, name: user.first_name, username: "" }, authDate: 0, startParam, chatType: "" });
  const numbers = (a: { groups: { group: t.ProjectGroup }[] }) => a.groups.map((g) => g.group.number);

  before(async () => {
    const db = await getDb();
    await db.insert(cohorts).values({ id: "dap-test", programme: "DAP", slug: "ay2627", name: "AY26/27", visibility: "live" });
    await db.insert(people).values([
      { email: admin.email, name: "Mingda", role: "dap_exco", telegramUserId: MINGDA.id },
      { email: "lodge@smu.edu.sg", name: "Lodge", role: "lodge_exco", telegramUserId: 333 },
    ]);
    g1 = await t.saveProjectGroup(admin, { cohortId: "dap-test", number: 1, name: "Alpha" });
    g2 = await t.saveProjectGroup(admin, { cohortId: "dap-test", number: 2, name: "Beta" });
    await t.saveProjectGroup(admin, { cohortId: "dap-test", number: 3, name: "No chat yet" });
    await t.connectChat(g1.id, -1001);
    await t.connectChat(g2.id, -1002);
  });
  beforeEach(() => clearMembershipCache());

  it("a DAP exco may open every project group, and diagnostics show what Telegram says per chat", async () => {
    const { api, asked } = telegram({ "-1001:111": "creator", "-1002:111": new Error("Bad Request: member list is inaccessible") });
    const quiet = await resolveAccess(as(MINGDA), api, { now: NOW });
    assert.deepEqual([numbers(quiet), quiet.groups.map((g) => g.how)], [[1, 2, 3], ["admin", "admin", "admin"]]);
    assert.deepEqual([quiet.checks, asked], [[], []]); // no questions to Telegram unless diagnosing
    const loud = await resolveAccess(as(MINGDA), api, { diagnose: true, now: NOW });
    assert.deepEqual(loud.checks, [
      { group: 1, chatId: -1001, status: "creator" },
      { group: 2, chatId: -1002, error: "Bad Request: member list is inaccessible" },
    ]);
  });

  it("a member gets the project group of a chat Telegram says they are in, asking about the linked one first", async () => {
    const { api, asked } = telegram({ "-1002:2001": "member" });
    const a = await resolveAccess(as(MIA, "g2"), api, { now: NOW });
    assert.deepEqual([numbers(a), a.groups[0].how, a.admin], [[2], "member", null]);
    assert.deepEqual(asked, ["-1002:2001"]); // one question in the usual case

    clearMembershipCache();
    const second = telegram({ "-1001:2001": "left", "-1002:2001": "administrator" });
    assert.deepEqual(numbers(await resolveAccess(as(MIA, "g1"), second.api, { now: NOW })), [2]); // linked group isn't hers; her own is found
    assert.deepEqual(second.asked, ["-1001:2001", "-1002:2001"]);
  });

  it("with no link, or a forged one, it is the chats the person is really in", async () => {
    const both = telegram({ "-1001:2001": "member", "-1002:2001": "creator" });
    assert.deepEqual(numbers(await resolveAccess(as(MIA), both.api, { now: NOW })), [1, 2]);
    clearMembershipCache();
    // A link naming a group they are not in opens nothing extra: someone typing g1 by hand gets only what Telegram confirms.
    const none = telegram({ "-1002:2002": "member" });
    assert.deepEqual(numbers(await resolveAccess(as(BEN, "g1"), none.api, { now: NOW })), [2]);
    clearMembershipCache();
    assert.deepEqual(numbers(await resolveAccess(as({ id: 9, first_name: "Stranger" }, "g1"), telegram({}).api, { now: NOW })), []);
    // A group with no connected chat can't be reached by a member at all.
    assert.ok(!numbers(await resolveAccess(as(MIA, "g3"), both.api, { now: NOW })).includes(3));
  });

  it("only people still in the chat count; a failure never lets anyone in and never shows the token", async () => {
    const cases: [string | { status: string; is_member?: boolean }, boolean][] = [
      ["creator", true], ["administrator", true], ["member", true],
      [{ status: "restricted", is_member: true }, true], [{ status: "restricted", is_member: false }, false],
      ["left", false], ["kicked", false],
    ];
    for (const [answer, expected] of cases) {
      clearMembershipCache();
      const a = await resolveAccess(as(MIA, "g1"), telegram({ "-1001:2001": answer }).api, { now: NOW });
      assert.equal(numbers(a).includes(1), expected, JSON.stringify(answer));
    }
    clearMembershipCache();
    const forbidden = () => new Error(`Forbidden at https://api.telegram.org/bot${TOKEN}/getChatMember`);
    const broken = telegram({ "-1001:2001": forbidden(), "-1002:2001": new Error("Bad Request: chat not found"), "-1001:111": forbidden() });
    assert.deepEqual(numbers(await resolveAccess(as(MIA, "g1"), broken.api, { now: NOW })), []);
    const a = await resolveAccess(as(MINGDA), broken.api, { diagnose: true, now: NOW });
    assert.match(a.checks[0].error!, /bot<token>/);
    assert.ok(!JSON.stringify(a.checks).includes("TEST-TOKEN"));
  });

  it("a member never asks about chats they don't need: no diagnostics, and one question for one project group", async () => {
    const { api, asked } = telegram({ "-1001:2001": "member" });
    const a = await resolveAccess(as(MIA, "g1"), api, { diagnose: true, now: NOW });
    assert.deepEqual([numbers(a), a.checks, asked], [[1], [], ["-1001:2001"]]);

    clearMembershipCache();
    const other = telegram({ "-1002:2001": "member" });
    assert.deepEqual(numbers(await resolveAccess(as(MIA, "g1"), other.api, { only: 2, now: NOW })), [2]); // the link names g1; only g2 is asked
    assert.deepEqual(other.asked, ["-1002:2001"]);
    assert.deepEqual(numbers(await resolveAccess(as(MIA), other.api, { only: 3, now: NOW })), []); // no connected chat: nothing to ask
    assert.deepEqual(other.asked, ["-1002:2001"]);
  });

  it("a role without tracker access is a member like anyone else, and answers are reused for a minute", async () => {
    const { api, asked } = telegram({ "-1001:333": "member" });
    const a = await resolveAccess(as({ id: 333, first_name: "Lodge" }, "g1"), api, { now: NOW });
    assert.deepEqual([a.admin, numbers(a)], [null, [1]]);
    await resolveAccess(as({ id: 333, first_name: "Lodge" }, "g1"), api, { now: NOW + 30_000 });
    assert.equal(asked.length, 1); // cached
    await resolveAccess(as({ id: 333, first_name: "Lodge" }, "g1"), api, { now: NOW + 61_000 });
    assert.equal(asked.length, 2); // asked again after the minute: someone who left loses access
  });
});

describe("the Mini App endpoints", () => {
  const FRESH = (user: object, extra?: Record<string, string>) => launchData(user, extra);
  let g1: t.ProjectGroup;
  let g2: t.ProjectGroup;
  const body = async (r: Response) => ({ status: r.status, json: await r.json(), cache: r.headers.get("cache-control") });

  before(async () => {
    const groups = await t.listProjectGroups(admin, "dap-test");
    [g1, g2] = groups;
    const who = t.adminWho(admin);
    await t.saveMember(admin, { groupId: g1.id, name: "Mia Lim" });
    const m1 = await t.saveMilestone(admin, { groupId: g1.id, title: "Proposal", dueOn: "2030-01-15" });
    const m2 = await t.saveMilestone(admin, { groupId: g2.id, title: "Secret plan", dueOn: "2030-02-01" });
    await t.addSubtask(who, { milestoneId: m1.id, title: "Draft deck", dueOn: "2030-01-10", assigneeName: "Visiting mentor" });
    await t.addSubtask(who, { milestoneId: m2.id, title: "Hidden task" });
    await t.addBlocker(who, { milestoneId: m1.id, description: "Waiting on data" });
  });
  beforeEach(() => clearMembershipCache());

  it("session: refuses a missing, forged or expired launch with 401 and says so plainly", async () => {
    const { api } = telegram({});
    for (const [header, re] of [
      [undefined, /could not be verified/],
      [FRESH(MIA).replace("2001", "111"), /could not be verified/],
      [launchData(MIA, {}, MAX_AGE_SECONDS + 100), /expired/],
    ] as const) {
      const r = await body(await handleSession(request("/api/mini-app/session", header), api, TOKEN, NOW));
      assert.equal(r.status, 401);
      assert.match(r.json.error, re);
    }
  });

  it("session: a member sees their project groups and nothing about other chats; an admin sees the checks", async () => {
    const member = await body(await handleSession(request("/api/mini-app/session", FRESH(MIA, { start_param: "g1", chat_type: "group" })), telegram({ "-1001:2001": "member" }).api, TOKEN, NOW));
    assert.equal(member.status, 200);
    assert.equal(member.cache, "no-store");
    assert.deepEqual(member.json, { user: { id: 2001, name: "Mia" }, admin: false, chatType: "group", startParam: "g1", groups: [{ number: 1, name: "Alpha", how: "member" }] });
    assert.ok(!("checks" in member.json));

    clearMembershipCache();
    const exco = await body(await handleSession(request("/api/mini-app/session", FRESH(MINGDA)), telegram({ "-1001:111": "creator", "-1002:111": "administrator" }).api, TOKEN, NOW));
    assert.equal(exco.json.admin, true);
    assert.deepEqual(exco.json.groups.map((g: { number: number }) => g.number), [1, 2, 3]);
    assert.deepEqual(exco.json.checks, [{ group: 1, chatId: -1001, status: "creator" }, { group: 2, chatId: -1002, status: "administrator" }]);

    clearMembershipCache();
    const outsider = await body(await handleSession(request("/api/mini-app/session", FRESH(BEN)), telegram({}).api, TOKEN, NOW));
    assert.deepEqual([outsider.status, outsider.json.groups], [200, []]);
  });

  it("timeline: a member gets only their own project group's milestones, tasks and assignees", async () => {
    const { api } = telegram({ "-1001:2001": "member" });
    const r = await body(await handleTimeline(request("/api/mini-app/timeline?group=1", FRESH(MIA)), api, TOKEN, NOW));
    assert.equal(r.status, 200);
    assert.deepEqual(r.json.group, { number: 1, name: "Alpha" });
    assert.deepEqual(r.json.can, { manage: false });
    assert.deepEqual(r.json.members, [{ id: r.json.members[0].id, name: "Mia Lim" }]);
    assert.deepEqual(r.json.meeting.lastOn, null);
    assert.deepEqual(r.json.milestones, [
      {
        number: 1, title: "Proposal", notes: "", status: "todo", startsOn: null, dueOn: "2030-01-15",
        blockers: [{ number: 1, description: "Waiting on data", status: "open" }],
        tasks: [{ number: 1, title: "Draft deck", status: "todo", dueOn: "2030-01-10", assigneeId: null, assignee: "Visiting mentor" }],
      },
    ]);
    // Another project group's data never comes back, however the request is phrased.
    for (const group of ["2", "02", "3"]) {
      const other = await body(await handleTimeline(request(`/api/mini-app/timeline?group=${group}`, FRESH(MIA)), api, TOKEN, NOW));
      assert.equal(other.status, 403);
      assert.ok(!JSON.stringify(other.json).includes("Secret plan"));
    }
    assert.equal((await body(await handleTimeline(request("/api/mini-app/timeline", FRESH(MIA)), api, TOKEN, NOW))).status, 400); // no group named
    assert.equal((await body(await handleTimeline(request("/api/mini-app/timeline?group=1"), api, TOKEN, NOW))).status, 401); // no launch
  });

  it("timeline: a DAP exco may open any project group, with no chat membership needed", async () => {
    const { api, asked } = telegram({});
    const r = await body(await handleTimeline(request("/api/mini-app/timeline?group=2", FRESH(MINGDA)), api, TOKEN, NOW));
    assert.equal(r.status, 200);
    assert.equal(r.json.milestones[0].title, "Secret plan");
    assert.deepEqual(asked, []); // an admin's request doesn't ask Telegram anything
  });
});

describe("changes from the Mini App", () => {
  let g1: t.ProjectGroup;
  const post = (init: string | undefined, body: object) =>
    new Request("https://x.test/api/mini-app/action", { method: "POST", headers: { "content-type": "application/json", ...(init ? { authorization: `tma ${init}` } : {}) }, body: JSON.stringify(body) });
  const send = async (user: object | null, body: object, chats: Record<string, string> = { "-1001:2001": "member" }) => {
    const r = await handleAction(post(user ? launchData(user) : undefined, body), telegram(chats).api, TOKEN, NOW);
    return { status: r.status, json: await r.json() };
  };
  const timeline = async () => (await t.getTimeline(t.adminWho(admin), g1.id));

  before(async () => {
    [g1] = await t.listProjectGroups(admin, "dap-test");
  });
  beforeEach(() => clearMembershipCache());

  it("a member adds, edits, completes and deletes tasks and blockers in their own project group", async () => {
    const added = await send(MIA, { group: 1, action: "task.save", milestone: 1, title: "Interview users", dueOn: "2030-01-12", assigneeName: "Visiting mentor" });
    assert.deepEqual([added.status, added.json.message], [200, "Task T2 added"]);
    const m = added.json.timeline.milestones[0];
    assert.deepEqual(m.tasks.map((x: { number: number }) => x.number), [1, 2]);
    assert.equal(m.tasks[1].assignee, "Visiting mentor");

    const mia = added.json.timeline.members[0];
    const edited = await send(MIA, { group: 1, action: "task.save", number: 2, status: "done", assigneeId: mia.id });
    assert.equal(edited.json.message, "Task T2 saved");
    assert.deepEqual(edited.json.timeline.milestones[0].tasks[1], { number: 2, title: "Interview users", status: "done", dueOn: "2030-01-12", assigneeId: mia.id, assignee: "Mia Lim" });

    const cleared = await send(MIA, { group: 1, action: "task.save", number: 2, dueOn: "", assigneeId: null });
    assert.deepEqual([cleared.json.timeline.milestones[0].tasks[1].dueOn, cleared.json.timeline.milestones[0].tasks[1].assignee], [null, ""]);

    const blocker = await send(MIA, { group: 1, action: "blocker.save", milestone: 1, description: "Venue unavailable" });
    assert.equal(blocker.json.message, "Blocker B2 added");
    const resolved = await send(MIA, { group: 1, action: "blocker.save", number: 2, status: "resolved" });
    assert.equal(resolved.json.timeline.milestones[0].blockers[1].status, "resolved");
    await send(MIA, { group: 1, action: "blocker.delete", number: 2 });
    const gone = await send(MIA, { group: 1, action: "task.delete", number: 2 });
    assert.deepEqual([gone.json.message, gone.json.timeline.milestones[0].tasks.length, gone.json.timeline.milestones[0].blockers.length], ["Task T2 deleted", 1, 1]);
  });

  it("the bot's rules still apply: a task can't be due after its milestone, and numbers are never reused", async () => {
    const late = await send(MIA, { group: 1, action: "task.save", milestone: 1, title: "Too late", dueOn: "2030-02-01" });
    assert.equal(late.status, 400);
    assert.match(late.json.error, /can't be due after its milestone: M1 is due 15 Jan 2030/);
    const next = await send(MIA, { group: 1, action: "task.save", milestone: 1, title: "On time", dueOn: "2030-01-14" });
    assert.equal(next.json.message, "Task T3 added"); // T2 was used and deleted, the refused one used nothing
    assert.equal((await send(MIA, { group: 1, action: "task.save", milestone: 1, title: "  " })).status, 400);
    assert.equal((await send(MIA, { group: 1, action: "task.save", number: 99, status: "done" })).json.error, "Task T99 not found");
  });

  it("a member cannot change milestones or reminders; a DAP exco can", async () => {
    for (const body of [
      { group: 1, action: "milestone.save", title: "Sneaky", dueOn: "2030-03-01" },
      { group: 1, action: "milestone.delete", number: 1 },
      { group: 1, action: "reminders.set", on: false },
    ]) {
      const r = await send(MIA, body);
      assert.deepEqual([r.status, r.json.error], [400, "Only DAP exco can do that."]);
    }
    assert.equal((await timeline()).length, 1);

    const exco = (body: object) => send(MINGDA, body, {});
    const added = await exco({ group: 1, action: "milestone.save", title: "Prototype", startsOn: "2030-01-16", dueOn: "2030-03-01", notes: "Working demo" });
    assert.deepEqual([added.status, added.json.message], [200, "Milestone M2 added"]);
    const edited = await exco({ group: 1, action: "milestone.save", number: 2, title: "Prototype v1", dueOn: "2030-03-01", startsOn: "", status: "in_progress" });
    assert.deepEqual([edited.json.timeline.milestones[1].title, edited.json.timeline.milestones[1].startsOn, edited.json.timeline.milestones[1].status, edited.json.timeline.milestones[1].notes], ["Prototype v1", null, "in_progress", "Working demo"]);
    assert.equal((await exco({ group: 1, action: "reminders.set", on: false })).json.timeline.meeting.reminders, false);
    assert.equal((await exco({ group: 1, action: "reminders.set", on: "yes" })).status, 400);
    assert.equal((await exco({ group: 1, action: "milestone.delete", number: 2 })).json.timeline.milestones.length, 1);
  });

  it("a meeting is logged for today or a past day, never the future", async () => {
    const today = new Date(NOW + 8 * 3_600_000).toISOString().slice(0, 10);
    const now = await send(MIA, { group: 1, action: "meeting.log" });
    assert.deepEqual([now.status, now.json.message, now.json.timeline.meeting.lastOn], [200, "Meeting logged", today]);
    const future = await send(MIA, { group: 1, action: "meeting.log", date: "2999-01-01" });
    assert.match(future.json.error, /future/);
    const earlier = await send(MIA, { group: 1, action: "meeting.log", date: "2020-01-01" });
    assert.match(earlier.json.error, /earlier than the last logged meeting/);
    assert.equal((await send(MIA, { group: 1, action: "meeting.log", date: "2030-02-30" })).status, 400);
  });

  it("nothing changes without a valid launch, outside the chat, or for another project group", async () => {
    assert.equal((await send(null, { group: 1, action: "task.save", milestone: 1, title: "x" })).status, 401);
    assert.equal((await send(BEN, { group: 1, action: "task.save", milestone: 1, title: "Outsider" }, {})).status, 403);
    // Mia is in chat 1 only: group 2 stays closed, however the request names it.
    const other = await send(MIA, { group: 2, action: "task.save", milestone: 1, title: "Cross-group" });
    assert.equal(other.status, 403);
    assert.ok(!JSON.stringify(other.json).includes("Secret"));
    assert.equal((await send(MIA, { action: "task.save", title: "x" })).status, 400); // no group named
    // Numbers are per project group: M1 of group 1 is not reachable through group 2's numbers.
    const titles = (await timeline()).flatMap((m) => m.subtasks.map((s) => s.title));
    assert.ok(!titles.includes("Outsider") && !titles.includes("Cross-group"));
  });

  it("unknown or malformed requests are refused plainly", async () => {
    for (const action of ["milestone.nuke", "__proto__", "constructor", undefined]) {
      const r = await send(MIA, { group: 1, action });
      assert.deepEqual([r.status, r.json.error], [400, "That change is not available."]);
    }
    const bad = await handleAction(new Request("https://x.test/api/mini-app/action", { method: "POST", headers: { authorization: `tma ${launchData(MIA)}` }, body: "not json" }), telegram({ "-1001:2001": "member" }).api, TOKEN, NOW);
    assert.equal(bad.status, 400);
    assert.equal((await send(MIA, { group: 1, action: "task.save", milestone: 1, title: 5 })).status, 400);
  });
});
