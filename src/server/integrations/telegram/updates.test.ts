import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

process.env.PGLITE_DIR = path.join(mkdtempSync(path.join(tmpdir(), "updates-")), "db");

import { getDb } from "@/server/db";
import { telegramUpdates } from "@/server/db/schema";
import { claimUpdate, forgetOldUpdates } from "./updates";

describe("telegram update de-duplication", () => {
  it("handles each update ID once, in any order", async () => {
    assert.equal(await claimUpdate(900_000), true);
    assert.equal(await claimUpdate(900_000), false);
    // After a week without updates Telegram picks a random, possibly lower, next ID: still new.
    assert.equal(await claimUpdate(12), true);
    assert.equal(await claimUpdate(12), false);
  });

  it("forgets IDs older than two days", async () => {
    const db = await getDb();
    await db.insert(telegramUpdates).values({ updateId: 5, receivedAt: new Date(Date.now() - 3 * 86_400_000).toISOString() });
    assert.equal(await forgetOldUpdates(), 1);
    assert.equal(await claimUpdate(5), true); // forgotten, so it would run again
    assert.equal(await claimUpdate(900_000), false); // recent IDs are kept
  });
});
