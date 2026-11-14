import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { before, describe, it } from "node:test";

process.env.PGLITE_DIR = path.join(mkdtempSync(path.join(tmpdir(), "link-")), "db");
process.env.TELEGRAM_BOT_TOKEN = "123:test";
process.env.CMS_BOOTSTRAP_ADMINS = "boot@smu.edu.sg";

import { eq } from "drizzle-orm";
import { getDb } from "@/app/lib/db";
import { cohorts, people, projectGroups, telegramLinkCodes } from "@/app/lib/db/schema";
import { CmsError, type Actor } from "./actor";
import { claimAccountLink, claimChatLink, createAccountLink, createChatLink, forgetExpiredCodes, linkedTelegram, unlinkTelegram } from "./telegram-link";
import { telegramApi } from "./telegram";
import * as t from "./tracker";

// The bot's username comes from getMe: the shared client answers every call with this bot.
telegramApi().config.use(async () => ({ ok: true, result: { id: 123, is_bot: true, first_name: "Test", username: "TestBot" } as never }));

const rejects = (p: Promise<unknown>, re: RegExp) => assert.rejects(p, (e) => e instanceof CmsError && re.test(e.message));
const idOf = async (email: string) => (await (await getDb()).select().from(people).where(eq(people.email, email)))[0]?.telegramUserId;
const codeOf = (link: string) => link.split("=")[1];

const mingda: Actor = { email: "mingda.chen.2025@smu.edu.sg", name: "Mingda", role: "dap_exco" };
const boot: Actor = { email: "boot@smu.edu.sg", name: "Boot", role: "exco", superadmin: true };
const tg = (id: number) => ({ id, name: "Mingda Chen", username: "mingda" });
let g1: t.ProjectGroup;
let g2: t.ProjectGroup;

before(async () => {
  const db = await getDb();
  await db.insert(people).values([
    { email: mingda.email, name: "Mingda", role: "dap_exco" },
    { email: "ai@smu.edu.sg", name: "AI", role: "lodge_exco" },
    { email: "other@smu.edu.sg", name: "Other", role: "dap_exco" },
  ]);
  await db.insert(cohorts).values({ id: "dap-link", programme: "DAP", slug: "ay2526", name: "AY25/26", visibility: "hidden" });
  g1 = await t.saveProjectGroup(mingda, { cohortId: "dap-link", number: 1, name: "Alpha" });
  g2 = await t.saveProjectGroup(mingda, { cohortId: "dap-link", number: 2, name: "Beta" });
});

describe("account link", () => {
  it("is a random code that fits Telegram's start parameter, stored only as a hash", async () => {
    const link = await createAccountLink(mingda);
    assert.match(link, /^https:\/\/t\.me\/TestBot\?start=[\w-]{32}$/);
    const rows = await (await getDb()).select().from(telegramLinkCodes);
    assert.equal(rows.length, 1);
    assert.notEqual(rows[0].codeHash, codeOf(link));
  });

  it("links once, with the account's name, then the same code does nothing", async () => {
    const code = codeOf(await createAccountLink(mingda));
    assert.equal((await claimAccountLink(code, tg(1865174434))).email, mingda.email);
    assert.deepEqual(await linkedTelegram(mingda.email), { id: 1865174434, name: "Mingda Chen", username: "mingda" });
    await rejects(claimAccountLink(code, tg(42)), /invalid, expired or already used/);
    assert.equal(await idOf(mingda.email), 1865174434);
  });

  it("a new link replaces the unused one", async () => {
    const first = codeOf(await createAccountLink(mingda));
    const second = codeOf(await createAccountLink(mingda));
    await rejects(claimAccountLink(first, tg(1865174434)), /invalid/);
    await claimAccountLink(second, tg(1865174434));
  });

  it("rejects expired, unknown, wrong-role and already-taken Telegram accounts", async () => {
    const old = codeOf(await createAccountLink({ ...mingda, email: "other@smu.edu.sg" }, Date.now() - 11 * 60_000));
    await rejects(claimAccountLink(old, tg(7)), /expired/);
    await rejects(claimAccountLink("not-a-real-code", tg(7)), /invalid/);
    await rejects(createAccountLink({ email: "ai@smu.edu.sg", name: "AI", role: "lodge_exco" }), /cannot use/);
    const other = codeOf(await createAccountLink({ ...mingda, email: "other@smu.edu.sg" }));
    await rejects(claimAccountLink(other, tg(1865174434)), /already linked to another/);
  });

  it("creates the People row for a bootstrap superadmin", async () => {
    await claimAccountLink(codeOf(await createAccountLink(boot)), tg(55));
    assert.equal(await idOf(boot.email), 55);
  });

  it("unlinks, after which a fresh link works", async () => {
    await rejects(unlinkTelegram(mingda, "other@smu.edu.sg"), /Only an exco admin/);
    await unlinkTelegram(boot, "other@smu.edu.sg"); // exco admins may unlink anyone
    await unlinkTelegram(mingda);
    assert.equal(await linkedTelegram(mingda.email), null);
    await claimAccountLink(codeOf(await createAccountLink(mingda)), tg(1865174434));
    assert.equal(await idOf(mingda.email), 1865174434);
  });

  it("an account link posted in a group stops working", async () => {
    const code = codeOf(await createAccountLink(mingda));
    await rejects(claimChatLink(code, -100), /private chat with me, and it was posted here/);
    await rejects(claimAccountLink(code, tg(1865174434)), /invalid/);
  });
});

describe("chat link", () => {
  it("connects the chat it is used in to the exact project group, once", async () => {
    const link = await createChatLink(mingda, g2.id);
    assert.match(link, /^https:\/\/t\.me\/TestBot\?startgroup=[\w-]{32}$/);
    const code = codeOf(link);
    await rejects(claimAccountLink(code, tg(9)), /connects a group chat/); // opened privately: still usable
    assert.equal((await claimChatLink(code, -1002)).id, g2.id);
    await rejects(claimChatLink(code, -1003), /invalid/);
  });

  it("works for a cohort that isn't live, and moves a chat between groups", async () => {
    await claimChatLink(codeOf(await createChatLink(mingda, g1.id)), -1002); // group 2's chat moves to group 1
    const db = await getDb();
    const rows = await db.select().from(projectGroups).where(eq(projectGroups.cohortId, "dap-link"));
    assert.equal(rows.find((g) => g.id === g1.id)?.telegramChatId, -1002);
    assert.equal(rows.find((g) => g.id === g2.id)?.telegramChatId, null);
  });

  it("only DAP exco make links, only for groups that exist", async () => {
    await rejects(createChatLink({ email: "ai@smu.edu.sg", name: "AI", role: "lodge_exco" }, g1.id), /cannot use/);
    await rejects(createChatLink(mingda, 99_999), /not found/);
  });

  it("the daily cleanup deletes expired codes only", async () => {
    const db = await getDb();
    await db.delete(telegramLinkCodes);
    await createChatLink(mingda, g1.id, Date.now() - 11 * 60_000);
    await createAccountLink(mingda);
    assert.equal(await forgetExpiredCodes(), 1);
    assert.equal((await db.select().from(telegramLinkCodes)).length, 1);
  });
});
