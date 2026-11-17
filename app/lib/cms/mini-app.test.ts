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
import { clearMembershipCache, handleSession, handleTimeline, MAX_AGE_SECONDS, resolveAccess, validateInitData, type Launch } from "./mini-app";
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
    const broken = telegram({ "-1001:2001": new Error(`Forbidden at https://api.telegram.org/bot${TOKEN}/getChatMember`), "-1002:2001": new Error("Bad Request: chat not found") });
    const a = await resolveAccess(as(MIA, "g1"), broken.api, { diagnose: true, now: NOW });
    assert.deepEqual(numbers(a), []);
    assert.match(a.checks[0].error!, /bot<token>/);
    assert.ok(!JSON.stringify(a.checks).includes("TEST-TOKEN"));
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
    assert.deepEqual(r.json.milestones, [
      { number: 1, title: "Proposal", status: "todo", startsOn: null, dueOn: "2030-01-15", openBlockers: 1, tasks: [{ number: 1, title: "Draft deck", status: "todo", dueOn: "2030-01-10", assignee: "Visiting mentor" }] },
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
