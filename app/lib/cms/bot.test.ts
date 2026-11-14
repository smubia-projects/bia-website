import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { before, describe, it } from "node:test";

process.env.PGLITE_DIR = path.join(mkdtempSync(path.join(tmpdir(), "bot-")), "db");
process.env.TELEGRAM_BOT_USERNAME = "TestBot";

import { eq } from "drizzle-orm";
import { getDb } from "@/app/lib/db";
import { cohorts, people, projectGroups } from "@/app/lib/db/schema";
import type { Api } from "grammy";
import type { Update } from "grammy/types";
import { sendMeetingReminders, syncBotCommands } from "./bot";
import { createBot, offlineBotInfo } from "./telegram-bot";
import { createAccountLink, createChatLink } from "./telegram-link";
import * as t from "./tracker";

// Real IDs for the first live test: the team's group chat and Mingda's Telegram account.
const CHAT = -5557514552;
const MINGDA = 1865174434;
const MINGDA_EMAIL = "mingda.chen.2025@smu.edu.sg";
const MIA = 2001; // a mentee in the chat
const STRANGER = 9999;
const OTHER_CHAT = -7770001; // some other group the bot was added to

let calls: { method: string; body: Record<string, unknown> }[] = [];
// The real bot with a fake Telegram: every API call is recorded and answered with `true`.
const bot = createBot("123:test", offlineBotInfo("TestBot"));
bot.api.config.use(async (_prev, method, payload) => {
  calls.push({ method, body: payload as Record<string, unknown> });
  return { ok: true, result: true as never };
});
const handleUpdate = (update: unknown) => bot.handleUpdate(update as Update);
let nextId = 100;

/** The text of a message the bot sent: ordinary or rich (its HTML); "" for any other call. */
const sent = (c: { method: string; body: Record<string, unknown> }) =>
  c.method === "sendMessage" ? String(c.body.text) : c.method === "sendRichMessage" ? String((c.body.rich_message as { html: string }).html) : "";

/** Sends a message and returns the bot's reply text ("" when it stayed silent). */
async function say(chat: number, from: number, text: string, type = chat > 0 ? "private" : "group") {
  calls = [];
  // Telegram marks a leading command as a bot_command entity; grammY's bot.command() matches on it.
  const command = text.match(/^\/\S+/)?.[0];
  const entities = command ? [{ type: "bot_command", offset: 0, length: command.length }] : undefined;
  const update = { update_id: nextId++, message: { message_id: nextId, from: { id: from, first_name: from === MINGDA ? "Mingda" : "Mia" }, chat: { id: chat, type }, text, entities } };
  await handleUpdate(update);
  return calls.map(sent).filter(Boolean).join("\n");
}

async function press(chat: number, from: number, data: string) {
  calls = [];
  await handleUpdate({ update_id: nextId++, callback_query: { id: "q", from: { id: from, first_name: "X" }, message: { message_id: 1, chat: { id: chat, type: chat > 0 ? "private" : "group" } }, data } });
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

const mingda = { email: MINGDA_EMAIL, name: "Mingda", role: "dap_exco" as const };
const codeOf = (link: string) => link.split("=")[1];

describe("linking and connecting", () => {
  it("DM /start <code> links Mingda; an account link posted in a group stops working", async () => {
    assert.match(await say(MINGDA, MINGDA, "/start"), /don't know you yet/);
    assert.match(await say(CHAT, MINGDA, `/start ${codeOf(await createAccountLink(mingda))}`), /private chat with me, and it was posted here/);
    assert.match(await say(MINGDA, MINGDA, `/start ${codeOf(await createAccountLink(mingda))}`), /Linked/);
    const [row] = await (await getDb()).select().from(people).where(eq(people.email, MINGDA_EMAIL));
    assert.equal(row.telegramUserId, MINGDA);
    assert.equal(row.telegramName, "Mingda");
  });

  it("the bot only listens in connected chats; the connect link binds the exact group", async () => {
    assert.equal(await say(CHAT, MIA, "/milestones"), ""); // not connected yet
    assert.equal(await say(OTHER_CHAT, MINGDA, "/milestones"), ""); // admin, but a chat that isn't connected
    assert.equal(await say(CHAT, STRANGER, "/register 1"), ""); // /register is gone
    // Telegram sends this when the startgroup link adds the bot to the chat.
    assert.match(await say(CHAT, MINGDA, `/start@TestBot ${codeOf(await createChatLink(mingda, g1.id))}`), /Connected: this chat is <b>Group 1<\/b> \(Alpha\)/);
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
    assert.match(list, /<h3>Group 1 \(Alpha\)<\/h3>/);
    assert.match(list, /<table[^>]*><tr><th>#<\/th><th>Milestone<\/th>/); // a real table, not text chips
    assert.doesNotMatch(list, / · /);
    assert.match(list, /Proposal/);
    assert.match(list, /<td><tg-button type="callback_data" style="link" data="m:\d+">\d+<\/tg-button><\/td>/); // each row opens its milestone
  });

  it("members log tasks, blockers, assignees and meetings", async () => {
    const ms = (await t.getTimeline(t.adminWho({ email: MINGDA_EMAIL, name: "Mingda", role: "dap_exco" }), g1.id))[0].id;
    assert.match(await say(CHAT, MIA, `/task ${ms} Draft deck by 20 Nov`), /Added task/);
    assert.match(await say(CHAT, MIA, `/assign 1 nobody-here`), /assigned to "nobody-here" \(not on the member list\)/);
    assert.match(await say(CHAT, MIA, `/assign 1 me`), /assigned to Mia Lim\./); // her Telegram name, "Mia", matches the list
    assert.match(await say(CHAT, MIA, `/assign 1 mia`), /assigned to Mia Lim\./); // a whole word of a name on the list
    assert.match(await say(CHAT, MIA, `/taskstatus 1 doing`), /in progress/);
    assert.match(await say(CHAT, MIA, `/blocker ${ms} Waiting on dataset access`), /Logged blocker/);
    calls = [];
    await press(CHAT, MIA, `m:${ms}`);
    const detail = calls.map(sent).filter(Boolean).join("\n");
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
    assert.equal((await press(OTHER_CHAT, STRANGER, `y:t:1:${STRANGER}`)).find((c) => c.method === "answerCallbackQuery")?.body.text, "Not allowed");
    const ms = (await t.getTimeline(t.memberWho(g1.id, "x"), g1.id))[0].id;
    assert.match(String((await press(CHAT, MIA, `y:m:${ms}:${MIA}`)).find((c) => c.method === "answerCallbackQuery")?.body.text), /Only DAP exco/);
    assert.equal((await t.getTimeline(t.memberWho(g1.id, "x"), g1.id)).length, 2); // the milestone survived
    assert.equal((await t.getMilestone(t.memberWho(g1.id, "x"), (await t.getTimeline(t.memberWho(g1.id, "x"), g1.id))[0].id)).subtasks.length, 1);
    // Only the person who asked can press Delete or Cancel; anyone else gets a notice, nothing changes.
    for (const data of [`y:t:1:${MIA}`, `n:${MIA}`]) {
      const other = await press(CHAT, MINGDA, data);
      assert.equal(other.find((c) => c.method === "answerCallbackQuery")?.body.text, "Only the person who asked can do that.");
      assert.ok(!other.some((c) => c.method === "editMessageText"));
    }
    const done = await press(CHAT, MIA, `y:t:1:${MIA}`);
    assert.match(String(done.find((c) => c.method === "editMessageText")?.body.text), /Deleted task #1/);
    assert.match(String((await press(CHAT, MIA, `n:${MIA}`)).find((c) => c.method === "editMessageText")?.body.text), /Cancelled/);
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
    assert.match(await say(MINGDA, MINGDA, "/groups"), /Project Groups[\s\S]*<td>Alpha<\/td><td>Connected<\/td>[\s\S]*<td>Beta<\/td><td>Not connected<\/td>/);
    assert.match(await say(MINGDA, MINGDA, "/milestones 2"), /Secret plan/);
    assert.match(await say(MINGDA, MINGDA, `/done ${m2}`), /is now done/);
    assert.match(await say(MINGDA, MINGDA, "/reminders 2 off"), /Group 2 are off/);
    assert.match(await say(MINGDA, MINGDA, "/milestones"), /Add the project group's number/);
    // "Open in CMS" only in an admin's private chat: in a group chat everyone would see it.
    assert.match(await say(MINGDA, MINGDA, "/milestones 2"), /<tg-button type="url" url="https:\/\/[^"]+\/project-groups\/\d+">Open in CMS<\/tg-button>/);
    assert.doesNotMatch(await say(CHAT, MINGDA, "/milestones"), /Open in CMS/);
  });
});

describe("housekeeping", () => {
  it("ignores other bots' commands, answers unknown ones, dedupes updates", async () => {
    assert.equal(await say(CHAT, MIA, "/milestones@SomeOtherBot"), "");
    assert.match(await say(CHAT, MIA, "/nope"), /Unknown command/);
    assert.match(await say(CHAT, MIA, "/milestones@TestBot"), /Group 1/);
    assert.equal(await say(CHAT, MIA, "/milestones@OtherBot"), ""); // meant for another bot
    assert.match(await say(CHAT, MIA, "/help"), /<h3>Tracker Commands<\/h3><table[^>]*><tr><th>Command<\/th><th>Description<\/th><\/tr><tr><td>\/milestones<\/td>/);
    calls = [];
    await syncBotCommands(bot.api);
    const [groupMenu, privateMenu] = calls.map((c) => c.body as { commands: { command: string }[]; scope: { type: string } });
    assert.equal(groupMenu.scope.type, "all_group_chats");
    assert.ok(groupMenu.commands.some((c) => c.command === "task") && !groupMenu.commands.some((c) => c.command === "milestone"));
    assert.equal(privateMenu.scope.type, "all_private_chats");
    assert.ok(privateMenu.commands.some((c) => c.command === "milestone"));
    // Admin commands and the g3 tip only in a private chat; a group chat sees member commands only.
    assert.doesNotMatch(await say(CHAT, MIA, "/help"), /DAP Exco/);
    assert.doesNotMatch(await say(CHAT, MINGDA, "/help"), /DAP Exco/);
    assert.match(await say(MINGDA, MINGDA, "/help"), /DAP Exco Commands[\s\S]*\/milestone \[g3\][\s\S]*Add g3/);
    assert.doesNotMatch(await say(CHAT, MINGDA, "/help"), /\/register/);
  });

  it("handles an update Telegram re-sends only once", async () => {
    const update = { update_id: 777_000, message: { message_id: 1, date: 0, from: { id: MIA, is_bot: false, first_name: "Mia" }, chat: { id: CHAT, type: "group" }, text: "/help", entities: [{ type: "bot_command", offset: 0, length: 5 }] } };
    calls = [];
    await handleUpdate(update);
    await handleUpdate(update);
    assert.equal(calls.map(sent).filter(Boolean).length, 1);
  });

  it("follows the group when Telegram upgrades it to a supergroup", async () => {
    const NEW = -1005557514552;
    calls = [];
    await handleUpdate({ update_id: nextId++, message: { message_id: 1, chat: { id: CHAT, type: "group" }, migrate_to_chat_id: NEW } });
    assert.equal(await say(CHAT, MIA, "/milestones"), "");
    assert.match(await say(NEW, MIA, "/milestones", "supergroup"), /Group 1/);
  });
});

describe("meeting reminders", () => {
  const NEW = -1005557514552;
  it("sends once to the group's chat 3 weeks after the last meeting, and retries after a failed send", async () => {
    const db = await getDb();
    await db.update(projectGroups).set({ lastMeetingAt: new Date(Date.now() - 22 * 86_400_000).toISOString() }).where(eq(projectGroups.id, g1.id));
    const failing = {
      sendRichMessage: async () => {
        throw new Error("bot was kicked");
      },
    } as unknown as Api;
    assert.equal(await sendMeetingReminders(failing), 0);
    assert.equal((await t.dueMeetingReminders()).length, 1); // released, so tomorrow retries
    calls = [];
    assert.equal(await sendMeetingReminders(bot.api), 1);
    assert.equal(calls[0].body.chat_id, NEW);
    assert.equal(calls[0].method, "sendRichMessage");
    assert.match(sent(calls[0]), /Group 1 \(Alpha\)[\s\S]*Dr Tan[\s\S]*\/meeting/);
    assert.equal(await sendMeetingReminders(bot.api), 0);
    await say(NEW, MIA, "/meeting", "supergroup"); // a new meeting restarts the cycle
    assert.equal((await t.dueMeetingReminders()).length, 0);
    assert.equal(g2.meetingRemindersOn && (await t.dueMeetingReminders()).some((g) => g.id === g2.id), false); // switched off in the DM test
  });
});
