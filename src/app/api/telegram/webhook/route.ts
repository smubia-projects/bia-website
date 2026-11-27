import { webhookCallback } from "grammy";
import { after } from "next/server";
import { ensureBotCommands } from "@/server/dap/tracker/bot";
import { getBot } from "@/server/bot";

/*
 * Telegram bot webhook for the DAP timeline tracker. Set it from the dashboard
 * (see docs/setup/tracker-setup.md); Telegram sends TELEGRAM_WEBHOOK_SECRET with every update
 * and grammY answers 401 when it doesn't match. After that the answer is always 200:
 * the bot's error boundary logs failures and replies in the chat, so Telegram never
 * re-sends an update.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** The "/" menus are checked once per server start, after the first update that passes the secret check. */
let menusChecked = false;

export async function POST(request: Request) {
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET || undefined;
  if (!secretToken && process.env.VERCEL) {
    return Response.json({ error: "TELEGRAM_WEBHOOK_SECRET is not set" }, { status: 500 });
  }
  const response = await webhookCallback(getBot(), "std/http", { secretToken })(request);
  if (response.ok && !menusChecked) {
    menusChecked = true;
    after(() => ensureBotCommands().catch((error) => console.error("[bot] could not check the command menus", error)));
  }
  return response;
}
