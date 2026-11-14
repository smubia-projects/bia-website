import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { CmsError, type Actor } from "./actor";
import { deleteWebhook, expectedWebhookUrl, getWebhookInfo, setWebhook } from "./telegram-webhook";

const TOKEN = "123456:SECRET-BOT-TOKEN";
const dap: Actor = { email: "m@smu.edu.sg", name: "M", role: "dap_exco" };
const rejects = (p: Promise<unknown>, re: RegExp) => assert.rejects(p, (e) => e instanceof CmsError && re.test(e.message));

let calls: { url: string; body: Record<string, unknown> }[] = [];
const realFetch = globalThis.fetch;
const reply = (json: unknown) => {
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init.body)) });
    return new Response(JSON.stringify(json));
  }) as typeof fetch;
};

beforeEach(() => {
  calls = [];
  process.env.TELEGRAM_BOT_TOKEN = TOKEN;
  process.env.TELEGRAM_WEBHOOK_SECRET = "new-key_123";
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("webhook management", () => {
  it("only DAP exco and above", async () => {
    reply({ ok: true, result: {} });
    for (const role of ["lodge_exco", "lodge_head"] as const) {
      await rejects(getWebhookInfo({ ...dap, role }), /cannot manage/);
      await rejects(setWebhook({ ...dap, role }), /cannot manage/);
      await rejects(deleteWebhook({ ...dap, role }), /cannot manage/);
    }
    assert.equal(calls.length, 0);
  });

  it("reads Telegram's webhook and says whether it matches the target", async () => {
    reply({ ok: true, result: { url: expectedWebhookUrl(), pending_update_count: 2, max_connections: 1, allowed_updates: ["message"], last_error_date: 1_700_000_000, last_error_message: "Wrong response from the webhook: 500" } });
    const info = await getWebhookInfo(dap);
    assert.deepEqual([info.registered, info.matches, info.pendingUpdates, info.maxConnections, info.secretConfigured], [true, true, 2, 1, true]);
    assert.equal(info.lastError, "Wrong response from the webhook: 500");
    assert.equal(info.lastErrorAt, "2023-11-14T22:13:20.000Z");
    assert.ok(calls[0].url.endsWith("/getWebhookInfo"));

    reply({ ok: true, result: { url: "https://old.example/hook" } });
    const other = await getWebhookInfo(dap);
    assert.deepEqual([other.registered, other.matches], [true, false]);
    reply({ ok: true, result: { url: "" } });
    assert.equal((await getWebhookInfo(dap)).registered, false);
  });

  it("without a token it reports that instead of calling Telegram", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    reply({ ok: true, result: {} });
    const info = await getWebhookInfo(dap);
    assert.deepEqual([info.tokenConfigured, info.registered], [false, false]);
    await rejects(setWebhook(dap), /TELEGRAM_BOT_TOKEN is not set/);
    assert.equal(calls.length, 0);
  });

  it("deletes any existing webhook, then sets it with the current key, one connection and the update types the bot reads", async () => {
    reply({ ok: true, result: true });
    await setWebhook(dap);
    assert.deepEqual(calls.map((c) => c.url.split("/").pop()), ["deleteWebhook", "setWebhook"]);
    assert.deepEqual(calls[0].body, { drop_pending_updates: false });
    assert.deepEqual(calls[1].body, {
      url: expectedWebhookUrl(),
      secret_token: "new-key_123",
      max_connections: 1,
      allowed_updates: ["message", "callback_query"],
    });
  });

  it("says so when the old webhook was removed but the new one could not be set", async () => {
    let n = 0;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      calls.push({ url: String(url), body: JSON.parse(String(init.body)) });
      return new Response(JSON.stringify(++n === 1 ? { ok: true, result: true } : { ok: false, description: "Bad Request: bad webhook: HTTPS url must be provided" }));
    }) as typeof fetch;
    await rejects(setWebhook(dap), /old webhook was removed but the new one was not set \(Telegram error: Bad Request: bad webhook[^)]*\)\. Select Set Webhook to retry/);
    assert.equal(calls.length, 2);
  });

  it("refuses a missing or invalid key before calling Telegram", async () => {
    reply({ ok: true, result: true });
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    await rejects(setWebhook(dap), /TELEGRAM_WEBHOOK_SECRET is not set/);
    process.env.TELEGRAM_WEBHOOK_SECRET = "has space!";
    await rejects(setWebhook(dap), /1–256 characters/);
    process.env.TELEGRAM_WEBHOOK_SECRET = "x".repeat(257);
    await rejects(setWebhook(dap), /1–256 characters/);
    assert.equal(calls.length, 0);
  });

  it("deletes the webhook and keeps pending updates by default", async () => {
    reply({ ok: true, result: true });
    await deleteWebhook(dap);
    assert.ok(calls[0].url.endsWith("/deleteWebhook"));
    assert.deepEqual(calls[0].body, { drop_pending_updates: false });
  });

  it("turns Telegram errors into messages, and a network failure never leaks the token", async () => {
    reply({ ok: false, description: "Bad Request: bad webhook: HTTPS url must be provided for webhook" });
    await rejects(deleteWebhook(dap), /Telegram error: Bad Request: bad webhook/);
    globalThis.fetch = (async (url: string) => {
      throw new Error(`connect ECONNREFUSED for ${url}`);
    }) as typeof fetch;
    await assert.rejects(getWebhookInfo(dap), (e) => e instanceof CmsError && /could not be reached/.test(e.message) && !e.message.includes(TOKEN));
  });
});
