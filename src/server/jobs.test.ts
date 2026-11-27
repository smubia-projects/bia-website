import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runDailyJobs } from "./jobs";

describe("daily jobs", () => {
  it("runs every job even when one fails, and reports which", async () => {
    const ran: string[] = [];
    const { results, failed } = await runDailyJobs({
      first: async () => (ran.push("first"), 2),
      broken: async () => {
        ran.push("broken");
        throw new Error("Telegram is down");
      },
      last: async () => (ran.push("last"), 0),
    });
    assert.deepEqual(ran, ["first", "broken", "last"]);
    assert.deepEqual(results, { first: 2, broken: "failed", last: 0 });
    assert.equal(failed, true);
  });
});
