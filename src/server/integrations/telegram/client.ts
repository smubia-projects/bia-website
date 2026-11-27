import { Api, GrammyError, HttpError, type Transformer } from "grammy";
import { CmsError } from "../../core/actor";

/*
 * Telegram plumbing shared by the newsletter, the webhook panel and the DAP tracker bot,
 * all through grammY. This file knows nothing about features: the bot's handlers are put
 * together in telegram-bot.ts.
 *
 * A bot can only message a person who has sent it /start, which is why test sends ask
 * for a user ID and say so. Without TELEGRAM_BOT_TOKEN (localhost) every call is logged
 * instead of sent.
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.smubia.com").replace(/\/$/, "");

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Bot API calls give up after this long; serverless functions can't wait out grammY's long-polling default. */
const API_TIMEOUT_SECONDS = 10;

export const telegramToken = () => process.env.TELEGRAM_BOT_TOKEN || "";

/** Without a token nothing is sent: each call is logged and answered with `true`. */
export const dryRun: Transformer = async (_prev, method, payload) => {
  console.info(`[telegram:dry-run] ${method} ${JSON.stringify(payload)}`);
  // Callers don't read the result of a dry run, so `true` stands in for every method's result.
  return { ok: true, result: true as never };
};

/** grammY client options for this site: grammY's own fetch, with a timeout a serverless function can wait out. */
export const clientOptions = { timeoutSeconds: API_TIMEOUT_SECONDS };

let api: { token: string; client: Api } | undefined;

/** The Bot API client for sending (no update handling). One per process, rebuilt if the token changes. */
export function telegramApi(): Api {
  const token = telegramToken();
  if (api?.token !== token) {
    const client = new Api(token || "dry-run", clientOptions);
    if (!token) client.config.use(dryRun);
    api = { token, client };
  }
  return api.client;
}

let botUsername: { token: string; username: string } | undefined;

/** The bot's @username (without the @), from Telegram's getMe: asked once per process and token. "" without a token. */
export async function getBotUsername(): Promise<string> {
  const token = telegramToken();
  if (!token) return "";
  if (botUsername?.token !== token) botUsername = { token, username: (await telegramApi().getMe()).username };
  return botUsername.username;
}

/** A Telegram failure as an editor-readable message; the token never appears in it. */
export function telegramError(error: unknown): CmsError {
  if (error instanceof CmsError) return error;
  if (error instanceof GrammyError) return new CmsError(`Telegram error: ${error.description}`);
  if (error instanceof HttpError) return new CmsError("Telegram could not be reached. Try again in a moment.");
  return new CmsError("Telegram request failed");
}

export interface TelegramIssue {
  week: number;
  title: string;
  summary: string;
  coverImage: string;
  url: string;
  sessionTopic?: string;
  sessionGroup?: string;
}

export function formatIssueMessage(issue: TelegramIssue) {
  const lines = [
    `<b>This week in DAP · Week ${issue.week}</b>`,
    `<b>${escapeHtml(issue.title)}</b>`,
  ];
  if (issue.summary) lines.push("", escapeHtml(issue.summary));
  if (issue.sessionTopic) {
    lines.push(
      "",
      `Co-learning: ${escapeHtml(issue.sessionTopic)}${issue.sessionGroup ? ` (${escapeHtml(issue.sessionGroup)})` : ""}`
    );
  }
  lines.push("", `<a href="${issue.url}">Read the issue</a>`);
  return lines.join("\n");
}

function absoluteUrl(src: string) {
  if (!src) return "";
  return src.startsWith("/") ? `${SITE_URL}${src}` : src;
}

export async function sendIssueToTelegram(chatId: string, issue: TelegramIssue, client: Api = telegramApi()) {
  const target = chatId.trim();
  if (!target) throw new CmsError("Telegram user ID required");
  const text = formatIssueMessage(issue);
  if (!telegramToken()) {
    console.info(`[telegram:dry-run] to ${target}\n${text}`);
    return { dryRun: true };
  }

  const photo = absoluteUrl(issue.coverImage);
  // Local /uploads images aren't reachable by Telegram, so only send real URLs.
  const usePhoto = photo.startsWith("https://") && !photo.includes("localhost");
  try {
    if (usePhoto) await client.sendPhoto(target, photo, { caption: text, parse_mode: "HTML" });
    else await client.sendMessage(target, text, { parse_mode: "HTML", link_preview_options: { is_disabled: false } });
  } catch (error) {
    if (error instanceof GrammyError && /chat not found|can't initiate|bot was blocked|user is deactivated/i.test(error.description)) {
      const bot = await getBotUsername().catch(() => "");
      throw new CmsError(`Telegram couldn't deliver to ${target}. That person must send /start to ${bot ? `@${bot}` : "the bot"} first.`);
    }
    throw telegramError(error);
  }
  return { dryRun: false };
}
