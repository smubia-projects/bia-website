import { can, CmsError, ensure, type Actor } from "./actor";
import { SITE_URL } from "./telegram";

/*
 * Reading, setting and deleting the tracker bot's Telegram webhook from the dashboard.
 * The bot token and the webhook secret live only in the server environment: the secret
 * is sent to Telegram when the webhook is set and checked by /api/telegram/webhook, and
 * neither is ever returned to the browser. Changing the key therefore means changing
 * TELEGRAM_WEBHOOK_SECRET, redeploying, then setting the webhook again.
 */

export const WEBHOOK_PATH = "/api/telegram/webhook";
/** The one place Telegram is told to post to: the public site, not whichever host the dashboard is opened on. */
export const expectedWebhookUrl = () => `${SITE_URL}${WEBHOOK_PATH}`;

/** Telegram accepts 1–256 characters of A-Z, a-z, 0-9, "_" and "-" as a secret_token. */
const SECRET_OK = /^[A-Za-z0-9_-]{1,256}$/;

export interface WebhookInfo {
  tokenConfigured: boolean;
  secretConfigured: boolean;
  /** What Telegram would call, and what it is set to now */
  expectedUrl: string;
  url: string;
  registered: boolean;
  matches: boolean;
  pendingUpdates: number;
  maxConnections: number | null;
  allowedUpdates: string[];
  lastError: string | null;
  lastErrorAt: string | null;
}

/** One Bot API call. Failures become messages the editor can read; the token never appears in them. */
async function telegram<T>(method: string, body: Record<string, unknown> = {}): Promise<T> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  ensure(token, "TELEGRAM_BOT_TOKEN is not set");
  let json: { ok?: boolean; result?: T; description?: string };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    json = await res.json();
  } catch {
    throw new CmsError("Telegram could not be reached. Try again in a moment.");
  }
  if (!json.ok) throw new CmsError(`Telegram error: ${json.description ?? "request failed"}`);
  return json.result as T;
}

const requireTracker = (actor: Actor) => ensure(can.tracker(actor), "This role cannot manage the Telegram webhook");

/** Telegram's current webhook for the bot (a network call), plus whether the environment is ready to set one. */
export async function getWebhookInfo(actor: Actor): Promise<WebhookInfo> {
  requireTracker(actor);
  const base = {
    tokenConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    secretConfigured: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET),
    expectedUrl: expectedWebhookUrl(),
  };
  if (!base.tokenConfigured) {
    return { ...base, url: "", registered: false, matches: false, pendingUpdates: 0, maxConnections: null, allowedUpdates: [], lastError: null, lastErrorAt: null };
  }
  const r = await telegram<{
    url?: string;
    pending_update_count?: number;
    max_connections?: number;
    allowed_updates?: string[];
    last_error_date?: number;
    last_error_message?: string;
  }>("getWebhookInfo");
  const url = r.url ?? "";
  return {
    ...base,
    url,
    registered: url !== "",
    matches: url === base.expectedUrl,
    pendingUpdates: r.pending_update_count ?? 0,
    maxConnections: r.max_connections ?? null,
    allowedUpdates: r.allowed_updates ?? [],
    lastError: r.last_error_message ?? null,
    lastErrorAt: r.last_error_date ? new Date(r.last_error_date * 1000).toISOString() : null,
  };
}

/**
 * Points Telegram at this site with the current TELEGRAM_WEBHOOK_SECRET: deletes any existing
 * webhook first (one that failed to clear properly can otherwise stay stuck), then sets it. One
 * connection at a time, so updates arrive in order (the duplicate check relies on it), and only
 * the update types the bot reads. This is also how a new key is adopted after the env var changed.
 * Everything is validated before the first call, so a bad environment never leaves the bot
 * without a webhook.
 */
export async function setWebhook(actor: Actor) {
  requireTracker(actor);
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  ensure(process.env.TELEGRAM_BOT_TOKEN, "TELEGRAM_BOT_TOKEN is not set");
  ensure(secret, "TELEGRAM_WEBHOOK_SECRET is not set");
  ensure(SECRET_OK.test(secret), "TELEGRAM_WEBHOOK_SECRET must be 1–256 characters of A-Z, a-z, 0-9, _ or -");
  await telegram("deleteWebhook", { drop_pending_updates: false });
  try {
    await telegram("setWebhook", {
      url: expectedWebhookUrl(),
      secret_token: secret,
      max_connections: 1,
      allowed_updates: ["message", "callback_query"],
    });
  } catch (error) {
    const why = error instanceof CmsError ? error.message : "request failed";
    throw new CmsError(`The old webhook was removed but the new one was not set (${why}). Select Set Webhook to retry.`);
  }
}

/** Stops Telegram posting to the bot. Pending updates are kept unless asked to drop them. */
export async function deleteWebhook(actor: Actor, dropPending = false) {
  requireTracker(actor);
  await telegram("deleteWebhook", { drop_pending_updates: dropPending });
}
