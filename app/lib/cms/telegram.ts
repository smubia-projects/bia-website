import { CmsError } from "./actor";

/*
 * Outbound-only Telegram Bot API calls; the bot has no webhook or backend.
 * A bot can only message a person who has sent it /start, which is why test
 * sends ask for a user ID and say so.
 *
 * Without TELEGRAM_BOT_TOKEN (localhost) messages are logged instead of sent.
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.smubia.com").replace(/\/$/, "");

export function botUsername() {
  return process.env.TELEGRAM_BOT_USERNAME || "";
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

export async function sendIssueToTelegram(chatId: string, issue: TelegramIssue) {
  const target = chatId.trim();
  if (!target) throw new CmsError("Telegram user ID required");
  const text = formatIssueMessage(issue);
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.info(`[telegram:dry-run] to ${target}\n${text}`);
    return { dryRun: true };
  }

  const photo = absoluteUrl(issue.coverImage);
  // Local /uploads images aren't reachable by Telegram, so only send real URLs.
  const usePhoto = photo.startsWith("https://") && !photo.includes("localhost");
  const method = usePhoto ? "sendPhoto" : "sendMessage";
  const body = usePhoto
    ? { chat_id: target, photo, caption: text, parse_mode: "HTML" }
    : { chat_id: target, text, parse_mode: "HTML", link_preview_options: { is_disabled: false } };

  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
  if (!json.ok) {
    const desc = json.description ?? `HTTP ${res.status}`;
    if (/chat not found|can't initiate|bot was blocked|user is deactivated/i.test(desc)) {
      throw new CmsError(
        `Telegram couldn't deliver to ${target}. That person must send /start to ${botUsername() ? "@" + botUsername() : "the bot"} first.`
      );
    }
    throw new CmsError(`Telegram error: ${desc}`);
  }
  return { dryRun: false };
}

/** Any Bot API method, for the tracker bot. Dry-run (logged, not sent) without a token. */
export type TelegramCall = (method: string, body: Record<string, unknown>) => Promise<void>;

export const callTelegram: TelegramCall = async (method, body) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.info(`[telegram:dry-run] ${method} ${JSON.stringify(body)}`);
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
  if (!json.ok) throw new Error(`Telegram ${method} failed: ${json.description ?? res.status}`);
};
