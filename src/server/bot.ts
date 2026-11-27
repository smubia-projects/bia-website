import "server-only";
import { Bot, type Context, type NextFunction } from "grammy";
import type { UserFromGetMe } from "grammy/types";
import { trackerBot } from "./dap/tracker/bot";
import { clientOptions, dryRun, telegramToken } from "./integrations/telegram/client";
import { claimUpdate } from "./integrations/telegram/updates";

/*
 * The site's one Telegram bot: the grammY Bot with every feature's handlers on it. This is
 * the only file that knows both the plumbing (integrations/telegram/client.ts) and the features (dap/tracker/bot.ts), so the
 * plumbing never imports a feature. The webhook route (and later dev polling) use getBot().
 *
 * Order: the error boundary wraps everything, so after the webhook's secret check every
 * update gets a 200 and Telegram never re-sends one; then the duplicate check; then features.
 */

/** Stands in for getMe when there's no token (and in tests), so the bot runs without Telegram. */
export const offlineBotInfo = (username = "smubia_offline_bot"): UserFromGetMe => ({
  id: 0,
  is_bot: true,
  first_name: "SMUBIA (offline)",
  username,
  can_join_groups: true,
  can_read_all_group_messages: false,
  can_manage_bots: false,
  supports_inline_queries: false,
  supports_join_request_queries: false,
  can_connect_to_business: false,
  has_main_web_app: false,
  has_topics_enabled: false,
  allows_users_to_create_topics: false,
});

/**
 * Last line of defence for one update: logs it, and answers a command or button with a short
 * error so nobody is left waiting. The handlers already reply to the errors they expect.
 */
async function errorBoundary(ctx: Context, next: NextFunction) {
  try {
    await next();
  } catch (error) {
    console.error("[bot] update failed", ctx.update.update_id, error);
    try {
      if (ctx.callbackQuery) await ctx.answerCallbackQuery({ text: "Something went wrong" });
      else if (ctx.message?.text?.startsWith("/")) await ctx.reply("Something went wrong. Try again in a moment.");
    } catch {
      // Telegram itself is failing; the log above is all we can do.
    }
  }
}

/** Telegram re-sends an update it thinks failed; each update_id is handled once. */
async function onlyOnce(ctx: Context, next: NextFunction) {
  if (await claimUpdate(ctx.update.update_id)) await next();
}

/**
 * A Bot with all handlers. Tests pass their own token and botInfo, then add a transformer to bot.api.
 * Long polling (dev) passes a longer timeout, since each getUpdates call waits up to 30 seconds.
 */
export function createBot(token = telegramToken(), botInfo?: UserFromGetMe, timeoutSeconds = clientOptions.timeoutSeconds) {
  const info = botInfo ?? (token ? undefined : offlineBotInfo());
  const bot = new Bot(token || "offline", { client: { ...clientOptions, timeoutSeconds }, ...(info ? { botInfo: info } : {}) });
  if (!token) bot.api.config.use(dryRun);
  bot.use(errorBoundary);
  bot.use(onlyOnce);
  bot.use(trackerBot);
  bot.catch((error) => console.error("[bot] unhandled", error.ctx.update.update_id, error.error));
  return bot;
}

let shared: Bot | undefined;

/** The process's Bot, rebuilt if the token changes. */
export function getBot() {
  if (!shared || shared.token !== (telegramToken() || "offline")) shared = createBot();
  return shared;
}
