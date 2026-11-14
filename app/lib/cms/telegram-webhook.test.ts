import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { HttpError } from "grammy";
import { CmsError, type Actor } from "./actor";
import { telegramApi } from "./telegram";
import { deleteWebhook, expectedWebhookUrl, getWebhookInfo, setWebhook } from "./telegram-webhook";

const TOKEN = "123456:SECRET-BOT-TOKEN";
const dap: Actor = { email: "m@smu.edu.sg", name: "M", role: "dap_exco" };
const rejects = (p: Promise<unknown>, re: RegExp) => assert.rejects(p, (e) => e instanceof CmsError && re.test(e.message));

// A fake Telegram: every call on the shared client is recorded and answered by `answer`.
let calls: { method: string; body: Record<string, unknown> }[] = [];
let answer: (method: string) => unknown = () => ({ ok: true, result: true });
const reply = (json: unknown) => {
  answer = () => json;
};

beforeEach(() => {
  calls = [];
  process.env.TELEGRAM_BOT_TOKEN = TOKEN;
  process.env.TELEGRAM_WEBHOOK_SECRET = "new-key_123";
  // The client is rebuilt when the token changes; the newest fake runs first and never calls on.
  telegramApi().config.use(async (_prev, method, payload) => {
    calls.push({ method, body: payload as Record<string, unknown> });
    return answer(method) as never;
  });
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
    assert.equal(calls[0].method, "getWebhookInfo");

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
    assert.deepEqual(calls.map((c) => c.method), ["deleteWebhook", "setWebhook"]);
    assert.deepEqual(calls[0].body, { drop_pending_updates: false });
    assert.deepEqual(calls[1].body, {
      url: expectedWebhookUrl(),
      secret_token: "new-key_123",
      max_connections: 1,
      allowed_updates: ["message", "callback_query"],
    });
  });

  it("says so when the old webhook was removed but the new one could not be set", async () => {
    answer = (method) => (method === "deleteWebhook" ? { ok: true, result: true } : { ok: false, error_code: 400, description: "Bad Request: bad webhook: HTTPS url must be provided" });
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
    assert.equal(calls[0].method, "deleteWebhook");
    assert.deepEqual(calls[0].body, { drop_pending_updates: false });
  });

  it("turns Telegram errors into messages, and a network failure never leaks the token", async () => {
    reply({ ok: false, error_code: 400, description: "Bad Request: bad webhook: HTTPS url must be provided for webhook" });
    await rejects(deleteWebhook(dap), /Telegram error: Bad Request: bad webhook/);
    answer = () => {
      throw new HttpError(`Network request for 'getWebhookInfo' failed! (connect ECONNREFUSED for https://api.telegram.org/bot${TOKEN}/getWebhookInfo)`, new Error("ECONNREFUSED"));
    };
    await assert.rejects(getWebhookInfo(dap), (e) => e instanceof CmsError && /could not be reached/.test(e.message) && !e.message.includes(TOKEN));
  });
});
