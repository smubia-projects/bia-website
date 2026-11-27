import "@/tests/helpers/db";
import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";
import { getDb } from "@/app/lib/db";
import { cohorts, people } from "@/app/lib/db/schema";
import { getBot } from "@/app/lib/cms/telegram-bot";
import * as tracker from "@/app/lib/cms/tracker";
import { actorFor } from "@/tests/helpers/actors";
import { fakeTelegram, type TelegramCall } from "@/tests/helpers/telegram";

/*
 * The webhook route end to end: Telegram's request → grammY's webhookCallback → the bot.
 * The bot's own rules (commands, buttons, supergroup migration) are covered in
 * app/lib/cms/bot.test.ts; this file checks what the route adds around them.
 */
process.env.TELEGRAM_BOT_TOKEN = "123:test";
process.env.TELEGRAM_WEBHOOK_SECRET = "hook-secret";

const ADMIN = 111;
const MEMBER = 222;
const CHAT = -1001;
const OTHER_CHAT = -2002;

fakeTelegram();
const calls: TelegramCall[] = [];
// The route's bot has its own client: record and answer its calls too.
getBot().api.config.use(async (_prev, method, payload) => {
  calls.push({ method, body: (payload ?? {}) as Record<string, unknown> });
  return { ok: true, result: (method === "getMyCommands" ? [] : true) as never };
});

let POST: (request: Request) => Promise<Response>;
let nextId = 1;

const post = (update: unknown, secret: string | null = "hook-secret") =>
  POST(
    new Request("http://localhost/api/telegram/webhook", {
      method: "POST",
      headers: { "content-type": "application/json", ...(secret ? { "x-telegram-bot-api-secret-token": secret } : {}) },
      body: JSON.stringify(update),
    })
  );

const message = (chat: number, from: number, text: string, update_id = nextId++) => ({
  update_id,
  message: {
    message_id: update_id,
    date: 0,
    from: { id: from, is_bot: false, first_name: "X" },
    chat: { id: chat, type: chat > 0 ? "private" : "group", title: "G" },
    text,
    entities: text.startsWith("/") ? [{ type: "bot_command", offset: 0, length: text.split(" ")[0].length }] : undefined,
  },
});

const replies = () => calls.filter((c) => c.method === "sendMessage" || c.method === "sendRichMessage");

before(async () => {
  ({ POST } = await import("@/app/api/telegram/webhook/route"));
  const db = await getDb();
  await db.insert(cohorts).values({ id: "dap-c1", programme: "DAP", slug: "c1", name: "C1", visibility: "live" });
  await db.insert(people).values({ email: "dap_exco@smu.edu.sg", name: "Dana", role: "dap_exco", telegramUserId: ADMIN });
  const group = await tracker.saveProjectGroup(actorFor("dap_exco"), { cohortId: "dap-c1", number: 1, name: "Alpha" });
  await tracker.connectChat(group.id, CHAT);
  // The first good update schedules the "/" menu check with Next's after(), which needs a Next
  // request scope and throws here. The route sets its once-per-server flag first, so prime it.
  await post(message(ADMIN, ADMIN, "/help")).catch((error) => assert.match(String(error), /outside a request scope/));
});

beforeEach(() => calls.splice(0));

describe("/api/telegram/webhook", () => {
  it("answers 401 to a missing or wrong secret, and runs nothing", async () => {
    assert.equal((await post(message(ADMIN, ADMIN, "/help"), null)).status, 401);
    assert.equal((await post(message(ADMIN, ADMIN, "/help"), "wrong")).status, 401);
    assert.equal(replies().length, 0);
  });

  it("handles an update Telegram re-sends only once", async () => {
    const update = message(CHAT, MEMBER, "/milestones");
    assert.equal((await post(update)).status, 200);
    const first = replies().length;
    assert.ok(first > 0);
    assert.equal((await post(update)).status, 200);
    assert.equal(replies().length, first);
  });

  it("listens in connected chats only", async () => {
    assert.equal((await post(message(OTHER_CHAT, MEMBER, "/milestones"))).status, 200);
    assert.equal(replies().length, 0);
  });

  it("members can't use admin commands; admins can", async () => {
    await post(message(CHAT, MEMBER, "/milestone Kickoff by 31 Dec"));
    assert.match(String(replies().at(-1)?.body.text), /Only DAP exco/);
    await post(message(CHAT, ADMIN, "/milestone Kickoff by 31 Dec"));
    assert.match(String(replies().at(-1)?.body.text), /Added milestone/);
  });
});
