import { lt } from "drizzle-orm";
import { getDb } from "@/server/db";
import { telegramUpdates } from "@/server/db/schema";

/*
 * Telegram re-sends an update when it thinks the webhook failed. Each update_id is recorded
 * once, and only the first arrival is handled. Order doesn't matter: Telegram starts update
 * IDs again from a random number after a week without updates, so "highest ID wins" would
 * drop every update after such a gap.
 */

/** Telegram only re-sends for about a day, so two days of IDs is plenty. */
const KEEP_MS = 2 * 86_400_000;

/** True the first time an update ID is seen, false for a repeat. */
export async function claimUpdate(updateId: number) {
  const db = await getDb();
  const rows = await db
    .insert(telegramUpdates)
    .values({ updateId })
    .onConflictDoNothing()
    .returning({ updateId: telegramUpdates.updateId });
  return rows.length > 0;
}

/** Daily cleanup: forgets update IDs older than two days. Returns how many were deleted. */
export async function forgetOldUpdates(now = new Date()) {
  const db = await getDb();
  const cutoff = new Date(now.getTime() - KEEP_MS).toISOString();
  const rows = await db.delete(telegramUpdates).where(lt(telegramUpdates.receivedAt, cutoff)).returning({ updateId: telegramUpdates.updateId });
  return rows.length;
}
