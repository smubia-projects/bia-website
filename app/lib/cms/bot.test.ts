import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { before, describe, it } from "node:test";

process.env.PGLITE_DIR = path.join(mkdtempSync(path.join(tmpdir(), "bot-")), "db");
process.env.AUTH_SECRET = "test-secret";
process.env.TELEGRAM_BOT_USERNAME = "TestBot";

import { eq } from "drizzle-orm";
import { getDb } from "@/app/lib/db";
import { cohorts, people, projectGroups } from "@/app/lib/db/schema";
import { claimUpdate, handleUpdate, sendMeetingReminders, type TgUpdate } from "./bot";
import { makeLinkToken } from "./telegram-link";
import * as t from "./tracker";

// Real IDs for the first live test: the team's group chat and Mingda's Telegram account.
const CHAT = -5557514552;
const MINGDA = 1865174434;
const MINGDA_EMAIL = "mingda.chen.2025@smu.edu.sg";
const MIA = 2001; // a mentee in the chat
const STRANGER = 9999;
const OTHER_CHAT = -7770001; // some other group the bot was added to

let calls: { method: string; body: Record<string, unknown> }[] = [];
const tg = async (method: string, body: Record<string, unknown>) => void calls.push({ method, body });
let nextId = 100;

/** Sends a message and returns the bot's reply text ("" when it stayed silent). */
async function say(chat: number, from: number, text: string, type = chat > 0 ? "private" : "group") {
  calls = [];
  const update: TgUpdate = { update_id: nextId++, message: { message_id: nextId, from: { id: from, first_name: from === MINGDA ? "Mingda" : "Mia" }, chat: { id: chat, type }, text } };
  await handleUpdate(update, tg);
  return calls.filter((c) => c.method === "sendMessage").map((c) => String(c.body.text)).join("\n");
}

async function press(chat: number, from: number, data: string) {
  calls = [];
  await handleUpdate({ update_id: nextId++, callback_query: { id: "q", from: { id: from, first_name: "X" }, message: { message_id: 1, chat: { id: chat, type: chat > 0 ? "private" : "group" } }, data } }, tg);
  return calls;
}

let g1: t.ProjectGroup;
let g2: t.ProjectGroup;
let m2: number; // a milestone in group 2

before(async () => {
  const db = await getDb();
  await db.insert(cohorts).values({ id: "dap-test", programme: "DAP", slug: "ay2627", name: "AY26/27", visibility: "live" });
  await db.insert(people).values({ email: MINGDA_EMAIL, name: "Mingda", role: "dap_exco" });
  const admin = { email: MINGDA_EMAIL, name: "Mingda", role: "dap_exco" as const };
  g1 = await t.saveProjectGroup(admin, { cohortId: "dap-test", number: 1, name: "Alpha", mentors: "Dr Tan" });
  g2 = await t.saveProjectGroup(admin, { cohortId: "dap-test", number: 2, name: "Beta" });
  m2 = (await t.saveMilestone(admin, { groupId: g2.id, title: "Secret plan", dueOn: "2030-01-01" })).id;
  await t.saveMember(admin, { groupId: g1.id, name: "Mia Lim" });
});

describe("linking and registering", () => {
  it("DM /start <link> links Mingda; a group refuses links; strangers get nothing in groups", async () => {
    assert.match(await say(MINGDA, MINGDA, "/start"), /not registered/);
    assert.match(await say(CHAT, MINGDA, `/start ${makeLinkToken(MINGDA_EMAIL)}`), /private chat/);
    assert.match(await say(MINGDA, MINGDA, `/start ${makeLinkToken(MINGDA_EMAIL)}`), /Linked/);
    const [row] = await (await getDb()).select().from(people).where(eq(people.email, MINGDA_EMAIL));
    assert.equal(row.telegramUserId, MINGDA);
  });

  it("the bot only listens in registered chats", async () => {
    assert.equal(await say(CHAT, MIA, "/milestones"), ""); // not registered yet
    assert.equal(await say(CHAT, STRANGER, "/register 1"), ""); // not an admin
    assert.equal(await say(OTHER_CHAT, MINGDA, "/milestones"), ""); // admin, but unregistered group chat
    assert.match(await say(CHAT, MINGDA, "/register 9"), /does not exist/);
    assert.match(await say(CHAT, MINGDA, "/register 1"), /Registered: this chat is <b>Group 1<\/b> · Alpha/);
    assert.equal((await (await getDb()).select().from(projectGroups).where(eq(projectGroups.id, g1.id)))[0].telegramChatId, CHAT);
    assert.match(await say(CHAT, MIA, "/milestones"), /No milestones yet/); // everyone in the chat is a member
  });
});

describe("working in Group 1's chat", () => {
  it("admins set milestones; members cannot", async () => {
    assert.match(await say(CHAT, MINGDA, "/milestone Proposal from 1 Dec by 15 Dec"), /Added milestone <b>#\d+<\/b> Proposal, due 15 Dec/);
    assert.match(await say(CHAT, MINGDA, "/milestone G1 Prototype by 20 Dec"), /Added milestone/);
    assert.match(await say(CHAT, MINGDA, "/milestone Nodate"), /needs a due date/);
    assert.match(await say(CHAT, MIA, "/milestone Sneaky by 1 Dec"), /Only DAP exco/);
    assert.match(await say(CHAT, MIA, "/done 1"), /Only DAP exco/);
    const list = await say(CHAT, MIA, "/milestones");
    assert.match(list, /Group 1 · Alpha/);
    assert.match(list, /Proposal/);
  });

  it("members log tasks, blockers, assignees and meetings", async () => {
    const ms = (await t.getTimeline(t.adminWho({ email: MINGDA_EMAIL, name: "Mingda", role: "dap_exco" }), g1.id))[0].id;
    assert.match(await say(CHAT, MIA, `/task ${ms} Draft deck by 20 Nov`), /Added task/);
    assert.match(await say(CHAT, MIA, `/assign 1 mia`), /assigned/);
    assert.match(await say(CHAT, MIA, `/assign 1 nobody-here`), /No member named/);
    assert.match(await say(CHAT, MIA, `/taskstatus 1 doing`), /in progress/);
    assert.match(await say(CHAT, MIA, `/blocker ${ms} Waiting on dataset access`), /Logged blocker/);
    calls = [];
    await press(CHAT, MIA, `m:${ms}`);
    const detail = String(calls.find((c) => c.method === "sendMessage")?.body.text);
    assert.match(detail, /Draft deck/);
    assert.match(detail, /Mia Lim/);
    assert.match(detail, /Waiting on dataset access/);
    assert.match(await say(CHAT, MIA, "/resolve 1"), /resolved/);
    assert.match(await say(CHAT, MIA, "/meeting yesterday"), /Group 1 met its mentors/);
    assert.match(await say(CHAT, MIA, "/meeting 2 Jan 2020"), /earlier than the last logged meeting/);
    assert.match(await say(CHAT, MIA, "/meeting tomorrow"), /future/);
    assert.match(await say(CHAT, MIA, "/meeting banana"), /Couldn't read the date/);
  });

  it("an admin marks a milestone done", async () => {
    const ms = (await t.getTimeline(t.adminWho({ email: MINGDA_EMAIL, name: "Mingda", role: "dap_exco" }), g1.id))[0].id;
    assert.match(await say(CHAT, MINGDA, `/done ${ms}`), /✅ .*is now done/);
  });

  it("deletes ask first, and buttons are authorised by who pressed", async () => {
    const reply = await say(CHAT, MIA, "/deltask 1");
    assert.match(reply, /Delete task #1\?/);
    assert.equal((await press(OTHER_CHAT, STRANGER, "y:t:1")).find((c) => c.method === "answerCallbackQuery")?.body.text, "Not allowed");
    const ms = (await t.getTimeline(t.memberWho(g1.id, "x"), g1.id))[0].id;
    assert.match(String((await press(CHAT, MIA, `y:m:${ms}`)).find((c) => c.method === "answerCallbackQuery")?.body.text), /Only DAP exco/);
    assert.equal((await t.getTimeline(t.memberWho(g1.id, "x"), g1.id)).length, 2); // the milestone survived
    assert.equal((await t.getMilestone(t.memberWho(g1.id, "x"), (await t.getTimeline(t.memberWho(g1.id, "x"), g1.id))[0].id)).subtasks.length, 1);
    const done = await press(CHAT, MIA, "y:t:1");
    assert.match(String(done.find((c) => c.method === "editMessageText")?.body.text), /Deleted task #1/);
    assert.match(String((await press(CHAT, MIA, "n")).find((c) => c.method === "editMessageText")?.body.text), /Cancelled/);
  });
});

describe("groups never see each other", () => {
  it("another group's milestone is out of reach from Group 1's chat, even for an admin", async () => {
    assert.match(await say(CHAT, MIA, `/task ${m2} sneaky`), /not found/);
    assert.match(await say(CHAT, MIA, `/blocker ${m2} sneaky`), /not found/);
    assert.match(await say(CHAT, MINGDA, `/done ${m2}`), /not found/);
    assert.match(await say(CHAT, MINGDA, `/editmilestone ${m2} Leak by 1 Jan`), /not found/);
    assert.match(await say(CHAT, MINGDA, "/milestones 2"), /This chat is Group 1/);
    assert.match(await say(CHAT, MINGDA, "/groups"), /private chat/);
    assert.equal((await press(CHAT, MINGDA, `m:${m2}`)).find((c) => c.method === "answerCallbackQuery")?.body.text, "Milestone not found");
    assert.equal((await t.getMilestone(t.adminWho({ email: MINGDA_EMAIL, name: "M", role: "dap_exco" }), m2)).status, "todo");
  });

  it("admins reach every group from a private chat", async () => {
    assert.match(await say(MINGDA, MINGDA, "/groups"), /Project groups[\s\S]*chat ✅[\s\S]*chat ❌/);
    assert.match(await say(MINGDA, MINGDA, "/milestones 2"), /Secret plan/);
    assert.match(await say(MINGDA, MINGDA, `/done ${m2}`), /is now done/);
    assert.match(await say(MINGDA, MINGDA, "/reminders 2 off"), /Group 2 are off/);
    assert.match(await say(MINGDA, MINGDA, "/milestones"), /Which group/);
  });
});

describe("housekeeping", () => {
  it("ignores other bots' commands, answers unknown ones, dedupes updates", async () => {
    assert.equal(await say(CHAT, MIA, "/milestones@SomeOtherBot"), "");
    assert.match(await say(CHAT, MIA, "/nope"), /Unknown command/);
    assert.match(await say(CHAT, MIA, "/help"), /Tracker commands/);
    assert.doesNotMatch(await say(CHAT, MIA, "/help"), /DAP exco/);
    assert.match(await say(CHAT, MINGDA, "/help"), /\/register/);
    assert.equal(await claimUpdate(900_000), true);
    assert.equal(await claimUpdate(900_000), false);
    assert.equal(await claimUpdate(899_999), false);
    assert.equal(await claimUpdate(900_001), true);
  });

  it("follows the group when Telegram upgrades it to a supergroup", async () => {
    const NEW = -1005557514552;
    calls = [];
    await handleUpdate({ update_id: nextId++, message: { message_id: 1, chat: { id: CHAT, type: "group" }, migrate_to_chat_id: NEW } }, tg);
    assert.equal(await say(CHAT, MIA, "/milestones"), "");
    assert.match(await say(NEW, MIA, "/milestones", "supergroup"), /Group 1/);
  });
});

describe("meeting reminders", () => {
  const NEW = -1005557514552;
  it("sends once to the group's chat 3 weeks after the last meeting, and retries after a failed send", async () => {
    const db = await getDb();
    await db.update(projectGroups).set({ lastMeetingAt: new Date(Date.now() - 22 * 86_400_000).toISOString() }).where(eq(projectGroups.id, g1.id));
    const failing = async () => {
      throw new Error("bot was kicked");
    };
    assert.equal(await sendMeetingReminders(failing), 0);
    assert.equal((await t.dueMeetingReminders()).length, 1); // released, so tomorrow retries
    calls = [];
    assert.equal(await sendMeetingReminders(tg), 1);
    assert.equal(calls[0].body.chat_id, NEW);
    assert.match(String(calls[0].body.text), /Group 1 · Alpha[\s\S]*Dr Tan[\s\S]*\/meeting/);
    assert.equal(await sendMeetingReminders(tg), 0);
    await say(NEW, MIA, "/meeting", "supergroup"); // a new meeting restarts the cycle
    assert.equal((await t.dueMeetingReminders()).length, 0);
    assert.equal(g2.meetingRemindersOn && (await t.dueMeetingReminders()).some((g) => g.id === g2.id), false); // switched off in the DM test
  });
});
