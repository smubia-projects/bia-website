import "@tests/helpers/db";
import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { cohorts, issues } from "@/server/db/schema";
import { GET as cron } from "@/app/api/cron/daily/route";
import { DAILY_JOBS, runDailyJobs } from "@/server/jobs";
import * as newsletter from "@/server/dap/newsletter";
import { setDapChannelId } from "@/server/core/settings";
import { actorFor } from "@tests/helpers/actors";
import { fakeTelegram } from "@tests/helpers/telegram";

process.env.TELEGRAM_BOT_TOKEN = "123:test";
const telegram = fakeTelegram(({ method }) => (method === "getMyCommands" ? [] : method === "sendMessage" ? { message_id: 1, date: 0, chat: { id: -100, type: "channel" } } : true));
const dap = actorFor("dap_exco");
const DAP = "dap-c1";

before(async () => {
  const db = await getDb();
  await db.insert(cohorts).values({ id: DAP, programme: "DAP", slug: "c1", name: "C1", visibility: "live" });
  await setDapChannelId(actorFor("exco"), "@smubia_dap");
});

beforeEach(() => {
  telegram.clear();
  delete process.env.CRON_SECRET;
});

describe("/api/cron/daily", () => {
  it("needs the cron secret when one is set", async () => {
    process.env.CRON_SECRET = "cron-key";
    assert.equal((await cron(new Request("http://localhost/api/cron/daily"))).status, 401);
    assert.equal((await cron(new Request("http://localhost/api/cron/daily", { headers: { authorization: "Bearer wrong" } }))).status, 401);
    const ok = await cron(new Request("http://localhost/api/cron/daily", { headers: { authorization: "Bearer cron-key" } }));
    assert.equal(ok.status, 200);
    assert.deepEqual(Object.keys(await ok.json()).sort(), Object.keys(DAILY_JOBS).sort());
  });

  it("runs each job on its own: one failing doesn't stop the others", async () => {
    const ran: string[] = [];
    const { results, failed } = await runDailyJobs({
      first: async () => ran.push("first"),
      broken: async () => {
        throw new Error("boom");
      },
      last: async () => ran.push("last"),
    });
    assert.equal(failed, true);
    assert.deepEqual(ran, ["first", "last"]);
    assert.equal(results.broken, "failed");
  });
});

describe("newsletter publishing", () => {
  it("publish now posts once to the DAP channel", async () => {
    const issue = await newsletter.createIssue(dap, DAP);
    await newsletter.updateIssue(dap, issue.id, { title: "Week 1: Intro", postToTelegram: true });
    const first = await newsletter.publishIssue(dap, issue.id);
    assert.equal(first.issue.status, "published");
    assert.equal(first.telegram, "sent");
    const posts = telegram.calls.filter((c) => c.body.chat_id === "@smubia_dap");
    assert.equal(posts.length, 1);
    // Publishing again never posts twice.
    assert.equal((await newsletter.publishIssue(dap, issue.id)).telegram, "skipped");
    assert.equal(telegram.calls.filter((c) => c.body.chat_id === "@smubia_dap").length, 1);
  });

  it("a scheduled issue goes out with the daily jobs once its time has passed", async () => {
    const issue = await newsletter.createIssue(dap, DAP);
    await newsletter.updateIssue(dap, issue.id, { title: "Week 2", postToTelegram: true });
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    await newsletter.scheduleIssue(dap, issue.id, tomorrow);
    assert.deepEqual(await newsletter.publishDueIssues(), []); // not yet
    // Move the publish time into the past, as if the cron fired after 09:00 SGT.
    const db = await getDb();
    await db.update(issues).set({ publishAt: new Date(Date.now() - 60_000).toISOString() }).where(eq(issues.id, issue.id));

    const published = await newsletter.publishDueIssues();
    assert.deepEqual(published.map((p) => [p.id, p.telegram]), [[issue.id, "sent"]]);
    assert.equal((await newsletter.getIssue(issue.id))?.status, "published");
    assert.deepEqual(await newsletter.publishDueIssues(), []); // nothing left
  });
});
