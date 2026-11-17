import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { before, describe, it } from "node:test";

process.env.PGLITE_DIR = path.join(mkdtempSync(path.join(tmpdir(), "bot-")), "db");
process.env.TELEGRAM_BOT_TOKEN = "123:test";

import { eq } from "drizzle-orm";
import { getDb } from "@/app/lib/db";
import { cohorts, people, projectGroups } from "@/app/lib/db/schema";
import type { Api } from "grammy";
import type { Update } from "grammy/types";
import { sgtDay } from "./bot-text";
import { botMenus, ensureBotCommands, sendMeetingReminders, sendTaskDeadlineAlerts, syncBotCommands } from "./bot";
import { telegramApi } from "./telegram";
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

// The bot's username comes from getMe: the shared client answers every call with this bot.
telegramApi().config.use(async () => ({ ok: true, result: { id: 123, is_bot: true, first_name: "Test", username: "TestBot" } as never }));

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
async function say(chat: number, from: number, text: string, type = chat > 0 ? "private" : "group", extra: Record<string, unknown> = {}) {
  calls = [];
  // Telegram marks a leading command as a bot_command entity; grammY's bot.command() matches on it.
  const command = text.match(/^\/\S+/)?.[0];
  const entities = command ? [{ type: "bot_command", offset: 0, length: command.length }] : undefined;
  const update = { update_id: nextId++, message: { message_id: nextId, from: { id: from, first_name: from === MINGDA ? "Mingda" : "Mia" }, chat: { id: chat, type }, text, entities, ...extra } };
  await handleUpdate(update);
  return calls.map(sent).filter(Boolean).join("\n");
}

async function press(chat: number, from: number, data: string, extra: Record<string, unknown> = {}) {
  calls = [];
  await handleUpdate({ update_id: nextId++, callback_query: { id: "q", from: { id: from, first_name: "X" }, message: { message_id: 1, chat: { id: chat, type: chat > 0 ? "private" : "group" }, ...extra }, data } });
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
    assert.match(await say(CHAT, MINGDA, "/milestone Proposal from 1 Dec by 15 Dec"), /Added milestone <b>M1<\/b> Proposal, due 15 Dec/);
    assert.match(await say(CHAT, MINGDA, "/milestone G1 Prototype by 20 Dec"), /Added milestone/);
    assert.match(await say(CHAT, MINGDA, "/milestone Nodate"), /needs a due date/);
    assert.match(await say(CHAT, MIA, "/milestone Sneaky by 1 Dec"), /Only DAP exco/);
    assert.match(await say(CHAT, MIA, "/done 1"), /Only DAP exco/);
    const list = await say(CHAT, MIA, "/milestones");
    assert.match(list, /<h3>Group 1 \(Alpha\)<\/h3>/);
    assert.match(list, /<table[^>]*><tr><th>#<\/th><th>Milestone<\/th>/); // a real table, not text chips
    assert.doesNotMatch(list, / · /);
    assert.match(list, /Proposal/);
    assert.match(list, /<td><tg-button type="callback_data" style="link" data="m:\d+">M\d+<\/tg-button><\/td>/); // each row opens its milestone
  });

  it("members log tasks, blockers, assignees and meetings", async () => {
    // Numbers count within the project group: Group 1's first milestone is M1 and its first task T1,
    // even though Group 2 made a milestone first.
    const ms = (await t.getTimeline(t.adminWho({ email: MINGDA_EMAIL, name: "Mingda", role: "dap_exco" }), g1.id))[0].id;
    assert.match(await say(CHAT, MIA, "/addtask 1 Draft deck by 20 Nov"), /Added task <b>T1<\/b> to M1: Draft deck/);
    assert.match(await say(CHAT, MIA, "/taskstatus T1 todo"), /Task <b>T1<\/b> Draft deck is now todo/); // T1 works as well as 1
    assert.match(await say(CHAT, MIA, "/addtask 1 Review by 31 Nov"), /Couldn't read the date "31 Nov"/); // a typo is refused, not kept in the title
    assert.match(await say(CHAT, MIA, "/edittask 1 by 31 Nov"), /Couldn't read the date "31 Nov"/);
    // A task can't be due after its milestone (M1 is due 15 Dec), by command or by edit.
    assert.match(await say(CHAT, MIA, "/edittask 1 by 25 Dec"), /A task can't be due after its milestone: M1 is due 15 Dec 2026\./);
    assert.match(await say(CHAT, MIA, "/addtask 1 Too late by 16 Dec"), /A task can't be due after its milestone: M1 is due 15 Dec 2026\./);
    assert.match(await say(CHAT, MIA, "/edittask 1 by 15 Dec"), /Updated task <b>T1<\/b>: Draft deck\./); // the milestone's own deadline is fine; only the date changes
    assert.match(await say(CHAT, MIA, `/assign 1 nobody-here`), /assigned to "nobody-here" \(not on the member list\)/);
    assert.match(await say(CHAT, MIA, `/assign 1 me`), /assigned to Mia Lim\./); // her Telegram name, "Mia", matches the list
    assert.match(await say(CHAT, MIA, `/assign 1 mia`), /assigned to Mia Lim\./); // a whole word of a name on the list
    assert.match(await say(CHAT, MIA, `/taskstatus 1 doing`), /in progress/);
    assert.match(await say(CHAT, MIA, "/blocker 1 Waiting on dataset access"), /Logged blocker <b>B1<\/b> on M1\. Close it with \/resolve 1\./);
    calls = [];
    await press(CHAT, MIA, `m:${ms}`);
    const detail = calls.map(sent).filter(Boolean).join("\n");
    assert.match(detail, /Draft deck/);
    assert.match(detail, /Mia Lim/);
    assert.match(detail, /Waiting on dataset access/);
    assert.match(detail, /<td>T1<\/td>/);
    assert.match(detail, /<li>B1 Waiting on dataset access<\/li>/);
    assert.match(await say(CHAT, MIA, "/resolve 1"), /Blocker <b>B1<\/b> resolved/);
    assert.match(await say(CHAT, MIA, "/meeting yesterday"), /Group 1 met its mentors/);
    assert.match(await say(CHAT, MIA, "/meeting 2 Jan 2020"), /earlier than the last logged meeting/);
    assert.match(await say(CHAT, MIA, "/meeting tomorrow"), /future/);
    assert.match(await say(CHAT, MIA, "/meeting banana"), /Couldn't read the date/);
  });

  it("an admin marks a milestone done", async () => {
    assert.match(await say(CHAT, MINGDA, "/done 1"), /✅ <b>M1<\/b> Proposal is now done/);
  });

  it("deletes ask first, and buttons are authorised by who pressed", async () => {
    const reply = await say(CHAT, MIA, "/deltask 1");
    assert.match(reply, /Delete task T1\?/);
    const task = (await t.getTimeline(t.memberWho(g1.id, "x"), g1.id))[0].subtasks[0].id;
    assert.equal((await press(OTHER_CHAT, STRANGER, `y:t:${task}:1:${STRANGER}`)).find((c) => c.method === "answerCallbackQuery")?.body.text, "Not allowed");
    const ms = (await t.getTimeline(t.memberWho(g1.id, "x"), g1.id))[0].id;
    assert.match(String((await press(CHAT, MIA, `y:m:${ms}:1:${MIA}`)).find((c) => c.method === "answerCallbackQuery")?.body.text), /Only DAP exco/);
    assert.equal((await t.getTimeline(t.memberWho(g1.id, "x"), g1.id)).length, 2); // the milestone survived
    assert.equal((await t.getMilestone(t.memberWho(g1.id, "x"), (await t.getTimeline(t.memberWho(g1.id, "x"), g1.id))[0].id)).subtasks.length, 1);
    // Only the person who asked can press Delete or Cancel; anyone else gets a notice, nothing changes.
    for (const data of [`y:t:${task}:1:${MIA}`, `n:${MIA}`]) {
      const other = await press(CHAT, MINGDA, data);
      assert.equal(other.find((c) => c.method === "answerCallbackQuery")?.body.text, "Only the person who asked can do that.");
      assert.ok(!other.some((c) => c.method === "editMessageText"));
    }
    const done = await press(CHAT, MIA, `y:t:${task}:1:${MIA}`);
    assert.match(String(done.find((c) => c.method === "editMessageText")?.body.text), /Deleted task T1\./);
    assert.match(String((await press(CHAT, MIA, `n:${MIA}`)).find((c) => c.method === "editMessageText")?.body.text), /Cancelled/);
  });
});

describe("groups never see each other", () => {
  it("another group's milestone is out of reach from Group 1's chat, even for an admin", async () => {
    // Numbers only ever mean this chat's group, and naming another group is refused.
    assert.match(await say(CHAT, MIA, "/blocker 9 sneaky"), /Milestone M9 not found/);
    assert.match(await say(CHAT, MINGDA, "/done g2 1"), /This chat is Group 1/);
    assert.match(await say(CHAT, MINGDA, "/editmilestone g2 1 Leak by 1 Jan"), /This chat is Group 1/);
    assert.match(await say(CHAT, MINGDA, "/milestones 2"), /This chat is Group 1/);
    assert.match(await say(CHAT, MINGDA, "/groups"), /private chat/);
    assert.equal((await press(CHAT, MINGDA, `m:${m2}`)).find((c) => c.method === "answerCallbackQuery")?.body.text, "Milestone not found");
    assert.equal((await t.getMilestone(t.adminWho({ email: MINGDA_EMAIL, name: "M", role: "dap_exco" }), m2)).status, "todo");
  });

  it("admins reach every group from a private chat", async () => {
    assert.match(await say(MINGDA, MINGDA, "/groups"), /Project Groups[\s\S]*<td>Alpha<\/td><td>Connected<\/td>[\s\S]*<td>Beta<\/td><td>Not connected<\/td>/);
    assert.match(await say(MINGDA, MINGDA, "/milestones 2"), /Secret plan/);
    assert.match(await say(MINGDA, MINGDA, "/done 1"), /Add the project group's number/); // which group's M1?
    assert.match(await say(MINGDA, MINGDA, "/done g2 1"), /<b>M1<\/b> Secret plan is now done/);
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
    assert.ok(groupMenu.commands.some((c) => c.command === "addtask") && groupMenu.commands.some((c) => c.command === "listtask") && !groupMenu.commands.some((c) => c.command === "task" || c.command === "milestone"));
    assert.equal(privateMenu.scope.type, "all_private_chats");
    assert.ok(privateMenu.commands.some((c) => c.command === "milestone"));
    // Admin commands and the g3 tip only in a private chat; a group chat sees member commands only.
    assert.doesNotMatch(await say(CHAT, MIA, "/help"), /DAP Exco/);
    assert.doesNotMatch(await say(CHAT, MINGDA, "/help"), /DAP Exco/);
    assert.match(await say(MINGDA, MINGDA, "/help"), /DAP Exco Commands[\s\S]*\/milestone \[g3\][\s\S]*Add g3/);
    assert.doesNotMatch(await say(CHAT, MINGDA, "/help"), /\/register/);
  });

  it("fixes the \"/\" menus only when Telegram's differ from the command list", async () => {
    const menus = botMenus();
    const stale = [{ command: "task", description: "Add a task" }, { command: "milestones", description: "Timeline and progress" }];
    const set: string[] = [];
    const fake = (have: Record<string, unknown>) =>
      ({
        getMyCommands: async ({ scope }: { scope: { type: string } }) => have[scope.type],
        setMyCommands: async (_cmds: unknown, o: { scope: { type: string } }) => void set.push(o.scope.type),
      }) as unknown as Api;
    // Up to date: nothing is sent.
    assert.equal(await ensureBotCommands(fake({ all_group_chats: menus.group, all_private_chats: menus.private })), false);
    assert.deepEqual(set, []);
    // The group menu still has /task (nobody pressed Set Webhook after the rename): both menus are sent.
    assert.equal(await ensureBotCommands(fake({ all_group_chats: stale, all_private_chats: menus.private })), true);
    assert.deepEqual(set, ["all_group_chats", "all_private_chats"]);
    // Never set at all: same.
    set.length = 0;
    assert.equal(await ensureBotCommands(fake({ all_group_chats: [], all_private_chats: [] })), true);
    assert.equal(set.length, 2);
    assert.ok(!menus.group.some((c) => c.command === "task") && menus.group.some((c) => c.command === "addtask"));
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

// ── Button flows ─────────────────────────────────────────────────────────

type Call = { method: string; body: Record<string, any> }; // eslint-disable-line @typescript-eslint/no-explicit-any

describe("button flows: commands without everything they need list the options", () => {
  const FLOW_CHAT = -8880003;
  const MIA_NAME = "Mia"; // her Telegram first name
  let g3: t.ProjectGroup;
  let scope: t.TrackerWho;
  const timeline = () => t.getTimeline(scope, g3.id);
  /** A milestone by its number (the timeline itself is in due-date order). */
  const milestone = async (n: number) => (await timeline()).find((m) => m.number === n)!;

  /** The bot's last message or edit, its text without tags, and its buttons. */
  const lastCall = () => [...calls].reverse().find((c) => c.method === "sendMessage" || c.method === "editMessageText") as Call;
  const textOf = (c: Call) => String(c.body.text).replace(/<[^>]+>/g, "");
  const buttonsOf = (c: Call): { text: string; callback_data: string }[] => (c.body.reply_markup?.inline_keyboard ?? []).flat();
  const dataOf = (c: Call, label: RegExp) => {
    const b = buttonsOf(c).find((x) => label.test(x.text));
    assert.ok(b, `no button matching ${label} in: ${buttonsOf(c).map((x) => x.text).join(" | ")}`);
    return b.callback_data;
  };
  const answerOf = () => calls.find((c) => c.method === "answerCallbackQuery")?.body.text;
  /** Presses a button on a message that replies to `replyText` (the command or the person's typed answer). */
  const tap = (from: number, data: string, replyText = "/x", chat = FLOW_CHAT) => press(chat, from, data, { reply_to_message: { message_id: 5, text: replyText } });
  /** Replies to a prompt the bot sent, the way Telegram delivers it. */
  const answer = (from: number, prompt: Call, text: string, chat = FLOW_CHAT) =>
    say(chat, from, text, "group", { reply_to_message: { message_id: 9, from: { id: 0, is_bot: true }, text: textOf(prompt) } });

  before(async () => {
    const db = await getDb();
    await db.update(people).set({ telegramUserId: MINGDA }).where(eq(people.email, MINGDA_EMAIL));
    g3 = await t.saveProjectGroup(mingda, { cohortId: "dap-test", number: 3, name: "Gamma" });
    await t.connectChat(g3.id, FLOW_CHAT);
    scope = t.adminWho(mingda);
    await t.saveMilestone(mingda, { groupId: g3.id, title: "Scope", dueOn: "2030-02-01" });
    await t.saveMilestone(mingda, { groupId: g3.id, title: "Build", dueOn: "2030-03-01" });
    await t.saveMember(mingda, { groupId: g3.id, name: "Mia Lim" });
    await t.saveMember(mingda, { groupId: g3.id, name: "Ben Koh" });
  });

  it("/addtask on its own: pick the milestone, reply with the title, Confirm", async () => {
    await say(FLOW_CHAT, MIA, "/addtask");
    const picker = lastCall();
    assert.match(textOf(picker), /Add task\nChoose a milestone\./);
    assert.deepEqual(buttonsOf(picker).map((b) => b.text), ["M1 Scope", "M2 Build", "Cancel"]);
    for (const b of buttonsOf(picker)) assert.ok(Buffer.byteLength(b.callback_data) <= 64, b.callback_data); // Telegram's limit
    assert.ok(buttonsOf(picker).slice(0, 2).every((b) => b.callback_data.endsWith(`:${MIA}`)));

    await tap(MIA, dataOf(picker, /M2/), "/addtask");
    assert.match(textOf(calls.find((c) => c.method === "editMessageText") as Call), /Add task\nM2 Build/); // the buttons go away
    const prompt = calls.find((c) => c.method === "sendMessage") as Call;
    assert.deepEqual([prompt.body.reply_markup.force_reply, prompt.body.reply_markup.selective], [true, true]);
    assert.match(String(prompt.body.text), new RegExp(`tg://user\\?id=${MIA}`)); // the box opens for her only
    assert.match(textOf(prompt), new RegExp(`reply with the task title\\. Add “by DD/MM/YYYY” to set a due date\\.[\\s\\S]*ref f:at:g3:2:${MIA}$`));
    assert.equal(prompt.body.reply_markup.input_field_placeholder, "Task title");

    // Someone else's reply to her prompt is ignored; a typo is caught before Confirm.
    assert.equal(await answer(MINGDA, prompt, "Not for you"), "");
    assert.match(await answer(MIA, prompt, "Wire the demo by 31 Nov"), /Couldn't read the date "31 Nov"[\s\S]*Reply to my message above/);
    assert.equal((await milestone(2)).subtasks.length, 0);

    await answer(MIA, prompt, "Wire the demo by 20 Dec");
    const confirm = lastCall();
    assert.match(textOf(confirm), /Add task\nAdd task “Wire the demo”, due 20 Dec to M2 “Build”\?/);
    assert.equal((await milestone(2)).subtasks.length, 0); // nothing yet: Confirm comes first
    assert.deepEqual(buttonsOf(confirm).map((b) => b.text), ["Confirm", "Cancel"]);

    const ok = dataOf(confirm, /Confirm/);
    await tap(MINGDA, ok, "Wire the demo by 20 Dec");
    assert.equal(answerOf(), "Only the person who asked can do that.");
    assert.equal((await milestone(2)).subtasks.length, 0);
    await tap(MIA, ok, "Wire the demo by 20 Dec");
    assert.match(textOf(lastCall()), /Added task T1 to M2: Wire the demo, due 20 Dec\./);
    assert.equal((await milestone(2)).subtasks[0].dueOn, `${new Date().getFullYear()}-12-20`);
  });

  it("deadlines in DD/MM/YYYY, including next year, are read as typed and shown with their year", async () => {
    await say(FLOW_CHAT, MIA, "/addtask 1");
    const prompt = lastCall();
    const nextYear = new Date().getFullYear() + 1;
    await answer(MIA, prompt, `Plan the launch by 05/01/${nextYear}`);
    assert.match(textOf(lastCall()), new RegExp(`Add task “Plan the launch”, due 5 Jan ${nextYear} to M1 “Scope”\\?`));
    assert.match(await answer(MIA, prompt, "Plan by 31/11/2027"), /Couldn't read the date "31\/11\/2027"[\s\S]*Use DD\/MM\/YYYY, for example 20\/11\/2026/);
    assert.equal((await milestone(1)).subtasks.length, 0); // only Confirm adds it
  });

  it("a task deadline after the milestone's is caught before Confirm", async () => {
    await say(FLOW_CHAT, MIA, "/addtask 1"); // M1 Scope is due 1 Feb 2030
    const prompt = lastCall();
    assert.match(await answer(MIA, prompt, "Too late by 5 Mar 2030"), /A task can't be due after its milestone: M1 is due 1 Feb 2030\./);
    assert.ok(!calls.some((c) => buttonsOf(c as Call).length)); // no Confirm button was offered
    await answer(MIA, prompt, "On time by 1 Feb 2030");
    assert.match(textOf(lastCall()), /Add task “On time”, due 1 Feb 2030 to M1 “Scope”\?/);
    // The reply above only reached Confirm; nothing was added, so later tests count the same tasks.
    assert.equal((await milestone(1)).subtasks.length, 0);
  });

  it("a partly typed command skips the steps already answered", async () => {
    await say(FLOW_CHAT, MIA, "/addtask 1"); // milestone given: asks for the title at once
    assert.match(textOf(lastCall()), /reply with the task title[\s\S]*M1 Scope[\s\S]*ref f:at:g3:1:/);
    assert.equal(lastCall().body.reply_markup.force_reply, true);

    await say(FLOW_CHAT, MIA, "/addtask Do the thing by 28 Dec"); // title given: only the milestone is missing
    const picker = lastCall();
    const data = dataOf(picker, /M1/);
    assert.match(data, /^f:at:g3:1:x:\d+$/); // the flag says the typed answer is in the command message
    await tap(MIA, data, "/addtask Do the thing by 28 Dec");
    assert.match(textOf(lastCall()), /Add task “Do the thing”, due 28 Dec to M1 “Scope”\?/); // straight to Confirm, no prompt
    assert.ok(!calls.some((c) => c.method === "sendMessage"));
    await tap(MIA, dataOf(lastCall(), /Confirm/), "/addtask Do the thing by 28 Dec");
    assert.match(textOf(lastCall()), /Added task T2 to M1: Do the thing/);

    // Nothing missing: it just runs, as before.
    assert.match(await say(FLOW_CHAT, MIA, "/addtask 1 Straight through"), /Added task <b>T3<\/b> to M1/);
  });

  it("task status, done and assign: pick the task, then the status or person", async () => {
    await say(FLOW_CHAT, MIA, "/taskstatus");
    const tasks = lastCall(); // two milestones have tasks: choose the milestone first
    assert.match(textOf(tasks), /Choose the milestone the task is in/);
    assert.deepEqual(buttonsOf(tasks).map((b) => b.text), ["M1 Scope (2)", "M2 Build (1)", "Cancel"]);
    await tap(MIA, dataOf(tasks, /M2/));
    const list = lastCall();
    assert.match(textOf(list), /Choose a task in M2/);
    await tap(MIA, dataOf(list, /T1 Wire the demo/));
    const status = lastCall();
    assert.deepEqual(buttonsOf(status).map((b) => b.text), ["To do", "In progress", "Done", "Cancel"]);
    await tap(MIA, dataOf(status, /In progress/));
    assert.match(textOf(lastCall()), /Set T1 “Wire the demo” to in progress\?/);
    await tap(MIA, dataOf(lastCall(), /Confirm/));
    assert.match(textOf(lastCall()), /Task T1 Wire the demo is now in progress/);

    await say(FLOW_CHAT, MIA, "/taskstatus 1"); // number given: straight to the status buttons
    assert.deepEqual(buttonsOf(lastCall()).map((b) => b.text), ["To do", "In progress", "Done", "Cancel"]);
    assert.match(await say(FLOW_CHAT, MIA, "/taskstatus 1 banana"), /Status must be todo, doing or done/); // a wrong word is still an error

    await say(FLOW_CHAT, MIA, "/taskdone 1");
    assert.match(await say(FLOW_CHAT, MIA, "/taskdone 1"), /is now done/); // a number is enough: no flow
    await say(FLOW_CHAT, MIA, "/taskdone"); // only tasks that are not done, and they are all in M1: no milestone step
    assert.deepEqual(buttonsOf(lastCall()).map((b) => b.text.replace(/^\S+ /, "")), ["T2 Do the thing", "T3 Straight through", "Cancel"]);

    await say(FLOW_CHAT, MIA, "/assign 2");
    const people = lastCall();
    assert.deepEqual(buttonsOf(people).map((b) => b.text), ["Ben Koh", "Mia Lim", `Me (${MIA_NAME})`, "Unassigned", "Cancel"]);
    await tap(MIA, dataOf(people, /Ben Koh/));
    assert.match(textOf(lastCall()), /Assign T2 “Do the thing” to Ben Koh\?/);
    await tap(MIA, dataOf(lastCall(), /Confirm/));
    assert.match(textOf(lastCall()), /Task T2 assigned to Ben Koh\./);
    await say(FLOW_CHAT, MIA, "/assign 2");
    await tap(MIA, dataOf(lastCall(), /Unassigned/));
    assert.match(textOf(lastCall()), /Unassign T2/);
    await tap(MIA, dataOf(lastCall(), /Confirm/));
    assert.match(textOf(lastCall()), /Task T2 is unassigned/);
  });

  it("/edittask and blockers: typed answers go through Confirm too", async () => {
    await say(FLOW_CHAT, MIA, "/edittask 3");
    const prompt = lastCall();
    assert.match(textOf(prompt), /new title, a new due date[\s\S]*T3 Straight through/);
    await answer(MIA, prompt, "Straight through, renamed");
    assert.match(textOf(lastCall()), /Update T3 “Straight through”: rename to “Straight through, renamed”\?/);
    await tap(MIA, dataOf(lastCall(), /Confirm/), "Straight through, renamed");
    assert.match(textOf(lastCall()), /Updated task T3: Straight through, renamed\./);

    await say(FLOW_CHAT, MIA, "/blocker");
    await tap(MIA, dataOf(lastCall(), /M2/));
    const ask = calls.find((c) => c.method === "sendMessage") as Call;
    await answer(MIA, ask, "Waiting on the dataset");
    await tap(MIA, dataOf(lastCall(), /Confirm/), "Waiting on the dataset");
    assert.match(textOf(lastCall()), /Logged blocker B1 on M2/);

    await say(FLOW_CHAT, MIA, "/resolve"); // one open blocker: no milestone step
    assert.match(textOf(lastCall()), /Choose a blocker in M2/);
    await tap(MIA, dataOf(lastCall(), /B1/));
    assert.match(textOf(lastCall()), /Resolve B1 “Waiting on the dataset”\?/);
    await tap(MIA, dataOf(lastCall(), /Confirm/));
    assert.match(textOf(lastCall()), /Blocker B1 resolved/);
    await say(FLOW_CHAT, MIA, "/resolve");
    assert.match(textOf(lastCall()), /There are no open blockers to choose from/);
    await say(FLOW_CHAT, MIA, "/reopenblocker");
    assert.match(textOf(lastCall()), /Choose a blocker in M2/);
  });

  it("deletes keep their own Delete/Cancel step at the end of the flow", async () => {
    await say(FLOW_CHAT, MIA, "/deltask");
    await tap(MIA, dataOf(lastCall(), /M1/));
    await tap(MIA, dataOf(lastCall(), /T3/));
    assert.match(textOf(lastCall()), /Delete task T3\?/);
    assert.deepEqual(buttonsOf(lastCall()).map((b) => b.text), ["Delete", "Cancel"]);
    assert.equal((await milestone(1)).subtasks.length, 2); // still there
    await tap(MIA, dataOf(lastCall(), /Delete/));
    assert.match(textOf(lastCall()), /Deleted task T3\./);
  });

  it("Cancel stops a flow, and only the person who asked can press its buttons", async () => {
    await say(FLOW_CHAT, MIA, "/addtask");
    const picker = lastCall();
    await tap(MINGDA, dataOf(picker, /M1/));
    assert.equal(answerOf(), "Only the person who asked can do that.");
    assert.ok(!calls.some((c) => c.method === "editMessageText"));
    await tap(MIA, dataOf(picker, /Cancel/));
    assert.match(textOf(lastCall()), /Cancelled/);
  });

  it("admin flows: milestones, status and reminders; members get no buttons for them", async () => {
    assert.match(await say(FLOW_CHAT, MIA, "/done"), /Only DAP exco/);
    assert.match(await say(FLOW_CHAT, MIA, "/milestone"), /Only DAP exco/);

    await say(FLOW_CHAT, MINGDA, "/done"); // only milestones that are not done
    assert.deepEqual(buttonsOf(lastCall()).map((b) => b.text), ["M1 Scope", "M2 Build", "Cancel"]);
    await tap(MINGDA, dataOf(lastCall(), /M1/));
    assert.match(textOf(lastCall()), /Mark M1 “Scope” as done\?/);
    await tap(MINGDA, dataOf(lastCall(), /Confirm/));
    assert.match(textOf(lastCall()), /M1 Scope is now done/);
    await say(FLOW_CHAT, MINGDA, "/done");
    assert.deepEqual(buttonsOf(lastCall()).map((b) => b.text), ["M2 Build", "Cancel"]);

    await say(FLOW_CHAT, MINGDA, "/milestone");
    const ask = lastCall();
    assert.match(textOf(ask), /reply with the milestone[\s\S]*Group 3 \(Gamma\)[\s\S]*ref f:ms:g3:/);
    assert.match(await answer(MINGDA, ask, "Review"), /A milestone needs a due date/);
    await answer(MINGDA, ask, "Review from 1 Dec by 30 Dec");
    assert.match(textOf(lastCall()), /Add milestone “Review” from 1 Dec, due 30 Dec to Group 3\?/);
    await tap(MINGDA, dataOf(lastCall(), /Confirm/), "Review from 1 Dec by 30 Dec");
    assert.match(textOf(lastCall()), /Added milestone M3 Review, due 30 Dec/);

    await say(FLOW_CHAT, MINGDA, "/editmilestone 3");
    await answer(MINGDA, lastCall(), "by 31 Dec");
    assert.match(textOf(lastCall()), /Update M3 “Review”: due 31 Dec\?/);

    await say(FLOW_CHAT, MINGDA, "/reminders");
    assert.deepEqual(buttonsOf(lastCall()).map((b) => b.text), ["On", "Off", "Cancel"]);
    await tap(MINGDA, dataOf(lastCall(), /Off/));
    assert.match(textOf(lastCall()), /Turn reminders off for Group 3\?/);
    await tap(MINGDA, dataOf(lastCall(), /Confirm/));
    assert.match(textOf(lastCall()), /Reminders for Group 3 are off/);

    await say(FLOW_CHAT, MINGDA, "/status");
    await tap(MINGDA, dataOf(lastCall(), /M2/));
    await tap(MINGDA, dataOf(lastCall(), /Done/));
    assert.match(textOf(lastCall()), /Set M2 “Build” to done\?/);
    await tap(MINGDA, dataOf(lastCall(), /Cancel/));
    assert.equal((await milestone(2)).status, "todo"); // cancelled: unchanged
  });

  it("forged buttons never reach past the person's own scope", async () => {
    // A member can't run an admin flow by crafting its buttons.
    await tap(MIA, `ok:ms:g3:${MIA}`, "Sneaky by 1 Dec");
    assert.match(textOf(lastCall()), /Only DAP exco/);
    assert.equal((await timeline()).length, 3);
    // Another group's number is refused in this chat, even for an admin.
    await tap(MINGDA, `f:addtask:g1:${MINGDA}`.replace("addtask", "at"));
    assert.match(String(answerOf()), /This chat is Group 3/);
    await tap(MINGDA, `f:dn:g1:${MINGDA}`);
    assert.match(String(answerOf()), /This chat is Group 3/);
    // A stranger in a chat that isn't connected gets nothing.
    await tap(STRANGER, `f:at:g3:${STRANGER}`, "/x", OTHER_CHAT);
    assert.equal(answerOf(), "Not allowed");
  });

  it("an admin's private chat starts with the group", async () => {
    await say(MINGDA, MINGDA, "/addtask");
    assert.deepEqual(buttonsOf(lastCall()).map((b) => b.text), ["Group 1 · Alpha", "Group 2 · Beta", "Group 3 · Gamma", "Cancel"]);
    await tap(MINGDA, dataOf(lastCall(), /Gamma/), "/addtask", MINGDA);
    assert.deepEqual(buttonsOf(lastCall()).map((b) => b.text), ["M3 Review", "M1 Scope", "M2 Build", "Cancel"]); // due-date order, like /milestones
    await tap(MINGDA, dataOf(lastCall(), /M3/), "/addtask", MINGDA);
    assert.match(textOf(calls.find((c) => c.method === "sendMessage") as Call), /reply with the task title[\s\S]*M3 Review/);
    assert.match(await say(MINGDA, MINGDA, "/addtask 1 Missing group"), /Add the project group's number/); // a number alone is still ambiguous here
    assert.match(await say(MINGDA, MINGDA, "/addtask g3 9"), /Milestone M9 not found/); // a wrong number fails now, not after the buttons
  });
});

describe("/listtask and the renamed commands", () => {
  const FLOW_CHAT = -8880003;
  it("/listtask lists the group's tasks, or one milestone's", async () => {
    const all = await say(FLOW_CHAT, MIA, "/listtask");
    assert.match(all, /<h3>Tasks: Group 3 \(Gamma\)<\/h3>/);
    assert.match(all, /<h4>M1: Scope<\/h4>/);
    assert.match(all, /<td>T1<\/td><td>Wire the demo<\/td><td>Done<\/td>/);
    assert.match(all, /<td>T2<\/td><td>Do the thing<\/td><td>To do<\/td><td>28 Dec<\/td><td>Unassigned<\/td>/);
    const one = await say(FLOW_CHAT, MIA, "/listtask 1");
    assert.match(one, /<h4>M1: Scope<\/h4>/);
    assert.doesNotMatch(one, /<h4>M2/);
    assert.match(await say(FLOW_CHAT, MIA, "/listtask 9"), /Milestone M9 not found/);
    assert.match(await say(FLOW_CHAT, MIA, "/listtask banana"), /Usage: \/listtask/);
    assert.match(await say(FLOW_CHAT, MINGDA, "/listtask g1"), /This chat is Group 3/); // an admin naming another group is refused
    assert.match(await say(FLOW_CHAT, MIA, "/listtask g1"), /Tasks: Group 3/); // a member always gets their own group
    assert.match(await say(MINGDA, MINGDA, "/listtask g3 2"), /<h4>M2: Build<\/h4>/);
    assert.match(await say(MINGDA, MINGDA, "/listtask g2"), /No tasks yet\. Add one with \/addtask/);
    assert.match(await say(MINGDA, MINGDA, "/listtask"), /Add the project group's number/);
  });

  it("/task points to the new names, and command names ignore case", async () => {
    assert.match(await say(FLOW_CHAT, MIA, "/task 1 Old habit"), /\/task is now \/addtask[\s\S]*\/listtask/);
    assert.match(await say(FLOW_CHAT, MIA, "/addTask 1 Camel case"), /Added task <b>T\d+<\/b> to M1: Camel case/);
    assert.match(await say(FLOW_CHAT, MIA, "/ADDTASK@TestBot 1 Shouting"), /Added task/);
    assert.match(await say(FLOW_CHAT, MIA, "/listTask 1"), /Camel case/);
    const help = await say(FLOW_CHAT, MIA, "/help");
    assert.match(help, /<td>\/addtask \[milestone#\] title \[by DD\/MM\/YYYY\]<\/td><td>Add a task<\/td>/);
    assert.match(help, /<td>\/listtask \[g3\] \[milestone#\]<\/td><td>List tasks<\/td>/);
    assert.doesNotMatch(help, /<td>\/task /);
    assert.match(help, /Send a command on its own, such as \/addtask/);
  });
});

// ── Task deadline alerts ─────────────────────────────────────────────────

describe("task deadline alerts", () => {
  const ALERT_CHAT = -8880004;
  const day = 86_400_000;
  const now0 = new Date();
  const today = sgtDay(now0);
  const plus = (n: number) => new Date(Date.parse(`${today}T00:00:00Z`) + n * day).toISOString().slice(0, 10);
  const at = (n: number) => new Date(now0.getTime() + n * day); // the same moment, n days later
  let g4: t.ProjectGroup;
  const ids: Record<string, number> = {};
  const who = () => t.adminWho(mingda);
  const alertCalls = () => calls.filter((c) => c.method === "sendRichMessage");

  before(async () => {
    g4 = await t.saveProjectGroup(mingda, { cohortId: "dap-test", number: 4, name: "Delta" });
    await t.connectChat(g4.id, ALERT_CHAT);
    await t.saveMember(mingda, { groupId: g4.id, name: "Mia Lim" });
    const m = await t.saveMilestone(mingda, { groupId: g4.id, title: "Launch", dueOn: plus(60) });
    const add = async (key: string, due: string | null, status?: "done") => {
      ids[key] = (await t.addSubtask(who(), { milestoneId: m.id, title: key, dueOn: due, ...(status ? { status } : {}), assigneeName: key === "soon" ? "Mia" : undefined })).id;
    };
    await add("soon", plus(3));
    await add("week", plus(7));
    await add("later", plus(8));
    await add("late", plus(-2));
    await add("done", plus(2), "done");
    await add("undated", null);
  });

  it("alerts a task due within a week and one already overdue, once each, in one message", async () => {
    calls = [];
    assert.equal(await sendTaskDeadlineAlerts(bot.api, now0), 3); // soon, week, late
    const [call] = alertCalls();
    assert.equal(alertCalls().length, 1);
    assert.equal(call.body.chat_id, ALERT_CHAT);
    const html = sent(call);
    assert.match(html, /<h3>Task Deadlines: Group 4 \(Delta\)<\/h3>/);
    assert.match(html, /<h4>Overdue<\/h4>[\s\S]*<td>late<\/td>[\s\S]*2 days ago/);
    assert.match(html, /<h4>Due Within a Week<\/h4>[\s\S]*<td>soon<\/td>[\s\S]*in 3 days[\s\S]*<td>week<\/td>[\s\S]*in 7 days/);
    assert.ok(html.indexOf("Overdue") < html.indexOf("Due Within a Week")); // the urgent part first
    assert.match(html, /<td>Launch<\/td>|M1: Launch/);
    assert.doesNotMatch(html, /<td>later<\/td>|<td>done<\/td>|<td>undated<\/td>/);
    calls = [];
    assert.equal(await sendTaskDeadlineAlerts(bot.api, now0), 0); // nothing is repeated
    assert.equal(alertCalls().length, 0);
  });

  it("alerts again, once, when a task's deadline passes, and when the next one comes within a week", async () => {
    calls = [];
    // 4 days later: "later" (due in 8 days) is now within a week; "soon" (due in 3 days) has passed.
    assert.equal(await sendTaskDeadlineAlerts(bot.api, at(4)), 2);
    const html = sent(alertCalls()[0]);
    assert.match(html, /<h4>Overdue<\/h4>[\s\S]*<td>soon<\/td>[\s\S]*Mia/); // overdue: the one that was due in 3 days
    assert.match(html, /<h4>Due Within a Week<\/h4>[\s\S]*<td>later<\/td>[\s\S]*in 4 days/);
    calls = [];
    assert.equal(await sendTaskDeadlineAlerts(bot.api, at(4)), 0);
    // 9 days later "week" and "later" have passed too: one overdue alert each, never a second.
    assert.equal(await sendTaskDeadlineAlerts(bot.api, at(9)), 2);
    assert.doesNotMatch(sent(alertCalls()[0]), /Due Within a Week/);
    assert.equal(await sendTaskDeadlineAlerts(bot.api, at(30)), 0);
  });

  it("a failed send is retried next run, and a new deadline gets fresh alerts", async () => {
    const fresh = (await t.addSubtask(who(), { milestoneId: (await t.getTimeline(who(), g4.id))[0].id, title: "fresh", dueOn: plus(2) })).id;
    const failing = { sendRichMessage: async () => { throw new Error("bot was kicked"); } } as unknown as Api;
    assert.equal(await sendTaskDeadlineAlerts(failing, now0), 0);
    assert.deepEqual((await t.dueTaskAlerts(today)).flatMap((x) => x.soon.map((a) => a.task.id)), [fresh]); // released
    calls = [];
    assert.equal(await sendTaskDeadlineAlerts(bot.api, now0), 1);
    // Moving the deadline starts its alerts again; marking it done ends them.
    await t.updateSubtask(who(), fresh, { dueOn: plus(5) });
    assert.equal((await t.dueTaskAlerts(today)).length, 1);
    await t.updateSubtask(who(), fresh, { status: "done" });
    assert.equal((await t.dueTaskAlerts(today)).length, 0);
  });

  it("stays quiet for groups with reminders off", async () => {
    const id = (await t.addSubtask(who(), { milestoneId: (await t.getTimeline(who(), g4.id))[0].id, title: "quiet", dueOn: plus(1) })).id;
    await t.setMeetingReminders(mingda, g4.id, false);
    assert.equal(await sendTaskDeadlineAlerts(bot.api, now0), 0);
    await t.setMeetingReminders(mingda, g4.id, true);
    assert.deepEqual((await t.dueTaskAlerts(today)).flatMap((x) => x.soon.map((a) => a.task.id)), [id]);
  });
});

// ── /start opens the Mini App ────────────────────────────────────────────

describe("/start opens the tracker Mini App", () => {
  const GROUP_CHAT = -8880003; // Group 3's connected chat from the flow tests
  const buttonsOf = () => calls.flatMap((c) => (c.body.reply_markup as { inline_keyboard?: Record<string, string>[][] } | undefined)?.inline_keyboard?.flat() ?? []);

  it("a linked admin's private chat gets a button that opens the app directly", async () => {
    const reply = await say(MINGDA, MINGDA, "/start");
    assert.match(reply, /Project tracker/);
    assert.match(reply, /Send \/help for the commands/);
    assert.deepEqual(buttonsOf(), [{ text: "Open tracker", web_app: { url: "https://www.smubia.com/mini-app" } } as never]);
  });

  it("a group chat gets a link naming its project group, once the app is set up", async () => {
    delete process.env.TELEGRAM_MINI_APP_NAME;
    assert.match(await say(GROUP_CHAT, MIA, "/start"), /<h3>Tracker Commands<\/h3>/); // not set up: the command list, as before
    assert.deepEqual(buttonsOf(), []);

    process.env.TELEGRAM_MINI_APP_NAME = "tracker";
    try {
      const reply = await say(GROUP_CHAT, MIA, "/start");
      assert.match(reply, /Project tracker: Group 3 \(Gamma\)/);
      // A link button: Telegram only allows a button that opens an app directly in a private chat.
      assert.deepEqual(buttonsOf(), [{ text: "Open tracker", url: "https://t.me/TestBot/tracker?startapp=g3" }]);
      assert.equal(await say(OTHER_CHAT, MIA, "/start"), ""); // a chat that isn't connected stays silent
    } finally {
      delete process.env.TELEGRAM_MINI_APP_NAME;
    }
  });

  it("someone the bot doesn't know gets no button in a private chat", async () => {
    assert.match(await say(STRANGER, STRANGER, "/start"), /I don't know you yet/);
    assert.deepEqual(buttonsOf(), []);
  });
});
