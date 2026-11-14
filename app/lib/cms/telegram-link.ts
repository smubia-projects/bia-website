import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/app/lib/db";
import { people } from "@/app/lib/db/schema";
import { can, CmsError, ensure, type Actor } from "./actor";
import { bootstrapAdmins, findAccess } from "./people";
import { botUsername } from "./telegram";

/*
 * Linking an admin's Telegram user ID to their CMS account.
 *
 * The CMS makes a link t.me/<bot>?start=<token>. The token is an expiry plus an
 * HMAC of (email, expiry) under AUTH_SECRET, so nothing is stored. Opening it
 * in a private chat with the bot binds that Telegram user ID to the email.
 * Single use comes from one rule: a link only works while the account has no
 * Telegram ID yet, so a replayed link does nothing. Unlinking is explicit.
 */

const TTL_MS = 10 * 60_000;

function sign(email: string, exp: string, secret: string) {
  return createHmac("sha256", secret).update(`${email}|${exp}`).digest("base64url").slice(0, 22);
}

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new CmsError("AUTH_SECRET is not set");
  return s;
}

export function makeLinkToken(email: string, now = Date.now()) {
  const exp = Math.floor((now + TTL_MS) / 1000).toString(36);
  return `${exp}_${sign(email.toLowerCase(), exp, secret())}`;
}

/** Admins link themselves: the one link they can ask for is their own. */
export function createAdminLink(actor: Actor) {
  ensure(can.tracker(actor), "This role cannot use the timeline tracker");
  ensure(botUsername(), "TELEGRAM_BOT_USERNAME is not set");
  return `https://t.me/${botUsername()}?start=${makeLinkToken(actor.email)}`;
}

/** Binds the Telegram user to whoever the token was made for. Throws a CmsError the bot can show. */
export async function claimAdminLink(token: string, telegramUserId: number, now = Date.now()) {
  const invalid = new CmsError("This link is invalid, expired or already used. Generate a new one in Settings › Telegram.");
  // The signature is base64url and may contain "_" itself; the base36 expiry never does.
  const cut = token.indexOf("_");
  const exp = token.slice(0, cut);
  const sig = token.slice(cut + 1);
  if (cut < 1 || !sig || parseInt(exp, 36) * 1000 < now) throw invalid;

  const db = await getDb();
  const unlinked = await db.select().from(people).where(isNull(people.telegramUserId));
  const candidates = new Set([...unlinked.map((p) => p.email), ...bootstrapAdmins()]);
  const match = [...candidates].find((email) => {
    const expect = Buffer.from(sign(email, exp, secret()));
    const got = Buffer.from(sig);
    return expect.length === got.length && timingSafeEqual(expect, got);
  });
  if (!match) throw invalid;

  const actor = await findAccess(match);
  if (!actor || !can.tracker(actor)) throw new CmsError("This account does not have DAP exco access.");
  const [taken] = await db.select({ email: people.email }).from(people).where(eq(people.telegramUserId, telegramUserId));
  if (taken) throw new CmsError("This Telegram account is already linked to a CMS account.");

  const [row] = await db.select({ email: people.email }).from(people).where(eq(people.email, match));
  if (row) {
    const done = await db
      .update(people)
      .set({ telegramUserId })
      .where(and(eq(people.email, match), isNull(people.telegramUserId)))
      .returning({ email: people.email });
    if (!done.length) throw invalid;
  } else {
    // A bootstrap superadmin who has no People row yet.
    await db.insert(people).values({ email: match, name: actor.name, role: "exco", telegramUserId });
  }
  return actor;
}

/** Clears an admin's Telegram link: their own, or anyone's for superadmins. */
export async function unlinkTelegram(actor: Actor, email = actor.email) {
  ensure(email.toLowerCase() === actor.email.toLowerCase() || can.managePeople(actor), "Only a superadmin can unlink someone else");
  const db = await getDb();
  await db.update(people).set({ telegramUserId: null }).where(eq(people.email, email.toLowerCase()));
}

/** The Telegram user ID stored for an account, or null when it is not linked. */
export async function linkedTelegramId(email: string): Promise<number | null> {
  const db = await getDb();
  const [row] = await db.select({ id: people.telegramUserId }).from(people).where(eq(people.email, email.toLowerCase()));
  return row?.id ?? null;
}
