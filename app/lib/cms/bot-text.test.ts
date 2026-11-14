import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { noonSgt, parseCommand, parseDate, parseStatus, shortDate, sgtDay, splitTitleAndDates } from "./bot-text";

const today = "2026-11-13";

describe("parseCommand", () => {
  it("splits command and args, strips @bot, flags other bots", () => {
    assert.deepEqual(parseCommand("/task 12 Draft the deck"), { cmd: "task", args: "12 Draft the deck", forOtherBot: false });
    assert.deepEqual(parseCommand("/Milestones@MyBot"), { cmd: "milestones", args: "", forOtherBot: false });
    assert.equal(parseCommand("/task@OtherBot 1 x", "MyBot")?.forOtherBot, true);
    assert.equal(parseCommand("/task@mybot 1 x", "MyBot")?.forOtherBot, false);
    assert.equal(parseCommand("hello /task"), null);
  });
});

describe("parseDate", () => {
  it("reads the common spellings", () => {
    assert.equal(parseDate("2026-12-01", today), "2026-12-01");
    assert.equal(parseDate("20 Nov", today), "2026-11-20");
    assert.equal(parseDate("Nov 20", today), "2026-11-20");
    assert.equal(parseDate("20 november 2027", today), "2027-11-20");
    assert.equal(parseDate("20/11", today), "2026-11-20");
    assert.equal(parseDate("1/12/2026", today), "2026-12-01");
    assert.equal(parseDate("tomorrow", today), "2026-11-14");
    assert.equal(parseDate("yesterday", today), "2026-11-12");
    assert.equal(parseDate("today", "2026-03-01"), "2026-03-01");
  });
  it("rejects what is not a real date", () => {
    for (const bad of ["31 Feb", "2026-02-30", "soon", "13/13", "32 Nov", "20 Foo"]) assert.equal(parseDate(bad, today), null, bad);
  });
  it("meetings without a year never land in the future", () => {
    assert.equal(parseDate("20 Dec", today, true), "2025-12-20");
    assert.equal(parseDate("12 Nov", today, true), "2026-11-12");
  });
});

describe("splitTitleAndDates", () => {
  it("title, start and due", () => {
    assert.deepEqual(splitTitleAndDates("Prototype from 1 Dec by 15 Dec", today), { title: "Prototype", startsOn: "2026-12-01", dueOn: "2026-12-15", badDue: null });
    assert.equal(splitTitleAndDates("Draft deck by 20 Nov", today).dueOn, "2026-11-20");
    assert.deepEqual(splitTitleAndDates("Just a title", today), { title: "Just a title", startsOn: null, dueOn: null, badDue: null });
  });
  it("keeps a non-date 'by' in the title and reports it", () => {
    const r = splitTitleAndDates("Presentation by the team", today);
    assert.equal(r.title, "Presentation by the team");
    assert.equal(r.dueOn, null);
    assert.equal(r.badDue, "the team");
  });
});

describe("small helpers", () => {
  it("shortDate, sgtDay, noonSgt, parseStatus", () => {
    assert.equal(shortDate("2026-11-20", today), "20 Nov");
    assert.equal(shortDate("2027-01-05", today), "5 Jan 2027");
    assert.equal(sgtDay("2026-11-12T18:00:00Z"), "2026-11-13"); // 02:00 next day in Singapore
    assert.equal(sgtDay(noonSgt("2026-11-12")), "2026-11-12");
    assert.equal(parseStatus("Doing"), "in_progress");
    assert.equal(parseStatus("nope"), null);
  });
});
