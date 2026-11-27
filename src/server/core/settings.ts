import { asc, eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/server/db";
import { people, siteSettings } from "@/server/db/schema";
import { ensure, type Actor } from "./actor";
import { can } from "./permissions";

/*
 * The Telegram bot's settings that live in the CMS (Settings › Telegram › Bot, exco admins).
 * Secrets never do: the bot token and the webhook secret stay environment variables.
 */

const KEY = "telegram";

interface TelegramSettings {
  /** Where published newsletter issues are posted: "@channel" or "-100…" */
  dapChannelId: string;
}

async function read(): Promise<TelegramSettings> {
  const db = await getDb();
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, KEY));
  return { dapChannelId: "", ...((row?.value as Partial<TelegramSettings>) ?? {}) };
}

/**
 * The DAP channel newsletter issues are posted to. TELEGRAM_DAP_CHANNEL_ID is the fallback
 * until each environment has the value saved in the CMS, after which the variable is removed.
 */
export async function getDapChannelId(): Promise<string> {
  return (await read()).dapChannelId || process.env.TELEGRAM_DAP_CHANNEL_ID || "";
}

/** What the Bot section shows: the saved channel, or the environment fallback still in use. */
export async function dapChannelView(actor: Actor) {
  ensure(can.manageTelegramBot(actor), "Only an exco admin can see the bot's settings");
  const saved = (await read()).dapChannelId;
  return { channelId: saved || process.env.TELEGRAM_DAP_CHANNEL_ID || "", fromEnv: !saved && Boolean(process.env.TELEGRAM_DAP_CHANNEL_ID) };
}

/** "@name" (5–32 characters) or a numeric chat ID like -1001234567890; "" clears it. */
const CHANNEL_OK = /^(@[A-Za-z][A-Za-z0-9_]{4,31}|-?\d{5,20})$/;

export async function setDapChannelId(actor: Actor, value: string) {
  ensure(can.manageTelegramBot(actor), "Only an exco admin can change the bot's settings");
  const id = value.trim();
  ensure(!id || CHANNEL_OK.test(id), "Enter the channel as @name or its numeric ID, e.g. -1001234567890");
  const db = await getDb();
  const row = { key: KEY, value: { ...(await read()), dapChannelId: id }, updatedAt: new Date().toISOString(), updatedBy: actor.email };
  await db.insert(siteSettings).values(row).onConflictDoUpdate({ target: siteSettings.key, set: row });
}

export interface LinkedAccount {
  email: string;
  name: string;
  telegramName: string;
  telegramUsername: string;
}

/** Everyone with a linked Telegram account, for the Bot section (exco admins). */
export async function listLinkedAccounts(actor: Actor): Promise<LinkedAccount[]> {
  ensure(can.manageTelegramBot(actor), "Only an exco admin can see linked Telegram accounts");
  const db = await getDb();
  return db
    .select({ email: people.email, name: people.name, telegramName: people.telegramName, telegramUsername: people.telegramUsername })
    .from(people)
    .where(isNotNull(people.telegramUserId))
    .orderBy(asc(people.name));
}
