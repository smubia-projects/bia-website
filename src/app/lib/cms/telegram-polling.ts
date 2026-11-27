import { HttpError, type Bot } from "grammy";
import { createBot } from "./telegram-bot";
import { telegramToken } from "./telegram";

/*
 * Local development without a public URL: the dev server long-polls Telegram for the bot's
 * updates instead of receiving them on the webhook. Started once per process from
 * instrumentation.ts. It never deletes a webhook: if the bot has one (a deployed site uses
 * it), polling would steal its updates, so it logs a warning and stays off. Use a separate
 * dev bot then, or delete the webhook from the dashboard first.
 *
 * If Telegram can't be reached at startup (offline, a network blip), it tries again every
 * 30 seconds. A refused token or a webhook stops it for good until the server restarts.
 */

const RETRY_MS = 30_000;

const state = globalThis as unknown as { __telegramPolling?: "starting" | "on" | "off" };

/** True while this process is polling, so the dashboard can say "Polling (local)". */
export const isPolling = () => state.__telegramPolling === "on";

export async function startDevPolling() {
  if (state.__telegramPolling) return; // hot reloads re-run imports, not this process
  state.__telegramPolling = "starting";
  if (!telegramToken()) {
    state.__telegramPolling = "off";
    return;
  }
  await connect(createBot(telegramToken(), undefined, 60));
}

async function connect(bot: Bot) {
  try {
    const hook = await bot.api.getWebhookInfo();
    if (hook.url) {
      state.__telegramPolling = "off";
      console.warn(`[telegram] Not polling: this bot has a webhook (${hook.url}). Use a dev bot, or delete the webhook on the dashboard first.`);
      return;
    }
    await bot.init(); // getMe, so bot.start() below has nothing left to fetch before polling
  } catch (error) {
    if (!(error instanceof HttpError)) {
      state.__telegramPolling = "off";
      console.error("[telegram] Could not start polling", error);
      return;
    }
    console.warn(`[telegram] Telegram could not be reached (${error.message}). Trying again in ${RETRY_MS / 1000} s.`);
    setTimeout(() => void connect(bot), RETRY_MS).unref();
    return;
  }
  // bot.start() would delete a webhook; there is none, checked just above. Once it runs,
  // grammY retries failed getUpdates calls by itself.
  void bot.start({
    allowed_updates: ["message", "callback_query"],
    onStart: (me) => {
      state.__telegramPolling = "on";
      console.info(`[telegram] Polling for @${me.username} (local development).`);
    },
  }).catch((error) => {
    state.__telegramPolling = "off";
    console.error("[telegram] Polling stopped", error);
  });
}
