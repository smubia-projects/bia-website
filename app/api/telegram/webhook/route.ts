import { webhookCallback } from "grammy";
import { getBot } from "@/app/lib/cms/telegram-bot";

/*
 * Telegram bot webhook for the DAP timeline tracker. Set it from the dashboard
 * (see docs/tracker-setup.md); Telegram sends TELEGRAM_WEBHOOK_SECRET with every update
 * and grammY answers 401 when it doesn't match. After that the answer is always 200:
 * the bot's error boundary logs failures and replies in the chat, so Telegram never
 * re-sends an update.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET || undefined;
  if (!secretToken && process.env.VERCEL) {
    return Response.json({ error: "TELEGRAM_WEBHOOK_SECRET is not set" }, { status: 500 });
  }
  return webhookCallback(getBot(), "std/http", { secretToken })(request);
}
