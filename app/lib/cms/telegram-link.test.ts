import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { before, describe, it } from "node:test";

process.env.PGLITE_DIR = path.join(mkdtempSync(path.join(tmpdir(), "link-")), "db");
process.env.AUTH_SECRET = "test-secret";
process.env.TELEGRAM_BOT_USERNAME = "TestBot";
process.env.CMS_BOOTSTRAP_ADMINS = "boot@smu.edu.sg";

import { eq } from "drizzle-orm";
import { getDb } from "@/app/lib/db";
import { people } from "@/app/lib/db/schema";
import { CmsError } from "./actor";
import { claimAdminLink, createAdminLink, makeLinkToken, unlinkTelegram } from "./telegram-link";

const rejects = (p: Promise<unknown>, re: RegExp) => assert.rejects(p, (e) => e instanceof CmsError && re.test(e.message));
const idOf = async (email: string) => (await (await getDb()).select().from(people).where(eq(people.email, email)))[0]?.telegramUserId;

before(async () => {
  const db = await getDb();
  await db.insert(people).values([
    { email: "mingda.chen.2025@smu.edu.sg", name: "Mingda", role: "dap_exco" },
    { email: "ai@smu.edu.sg", name: "AI", role: "lodge_exco" },
    { email: "other@smu.edu.sg", name: "Other", role: "dap_exco" },
  ]);
});

describe("admin link", () => {
  it("links once, then the same link does nothing", async () => {
    const token = makeLinkToken("mingda.chen.2025@smu.edu.sg");
    assert.ok(token.length < 64 && /^[\w-]+$/.test(token)); // fits Telegram's start parameter
    assert.equal((await claimAdminLink(token, 1865174434)).email, "mingda.chen.2025@smu.edu.sg");
    assert.equal(await idOf("mingda.chen.2025@smu.edu.sg"), 1865174434);
    await rejects(claimAdminLink(token, 42), /invalid, expired or already used/); // replay by someone else
    assert.equal(await idOf("mingda.chen.2025@smu.edu.sg"), 1865174434);
  });

  it("accepts every token, including signatures that contain an underscore", async () => {
    const db = await getDb();
    let seen = 0;
    for (let i = 0; i < 60 && seen < 3; i++) {
      const email = `u${i}@smu.edu.sg`;
      await db.insert(people).values({ email, name: `U${i}`, role: "dap_exco" });
      const token = makeLinkToken(email);
      if (token.slice(token.indexOf("_") + 1).includes("_")) seen++;
      assert.equal((await claimAdminLink(token, 5000 + i)).email, email);
    }
    assert.ok(seen > 0, "expected to hit an underscore signature");
  });

  it("rejects expired, forged, wrong-role and already-linked Telegram accounts", async () => {
    await rejects(claimAdminLink(makeLinkToken("other@smu.edu.sg", Date.now() - 11 * 60_000), 7), /expired/);
    await rejects(claimAdminLink("zzzzzz_forgedforgedforgedforged", 7), /invalid/);
    await rejects(claimAdminLink(makeLinkToken("ai@smu.edu.sg"), 7), /DAP exco access/);
    await rejects(claimAdminLink(makeLinkToken("other@smu.edu.sg"), 1865174434), /already linked/);
  });

  it("creates the People row for a bootstrap superadmin", async () => {
    await claimAdminLink(makeLinkToken("boot@smu.edu.sg"), 55);
    assert.equal(await idOf("boot@smu.edu.sg"), 55);
  });

  it("unlinks, after which a fresh link works", async () => {
    const actor = { email: "mingda.chen.2025@smu.edu.sg", name: "Mingda", role: "dap_exco" as const };
    await rejects(unlinkTelegram(actor, "other@smu.edu.sg"), /superadmin/);
    await unlinkTelegram(actor);
    assert.equal(await idOf(actor.email), null);
    await claimAdminLink(makeLinkToken(actor.email), 1865174434);
    assert.equal(await idOf(actor.email), 1865174434);
    assert.match(createAdminLink(actor), /^https:\/\/t\.me\/TestBot\?start=/);
  });
});
