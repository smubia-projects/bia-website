import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDate, parseStatus, splitTitleAndDates } from "./bot-text";
import { noonSgt, shortDate, sgtDay } from "@/shared/time";

const today = "2026-11-13";

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
  it("reads DD/MM/YYYY day first, with a four-digit year", () => {
    assert.equal(parseDate("05/01/2027", today), "2027-01-05"); // 5 January, not 1 May
    assert.equal(parseDate("31/12/2026", today), "2026-12-31");
    assert.equal(parseDate("1/2/2028", today), "2028-02-01");
    assert.equal(parseDate("29/02/2028", today), "2028-02-29"); // a leap day
    for (const bad of ["29/02/2027", "31/11/2026", "12/13/2026", "00/01/2027"]) assert.equal(parseDate(bad, today), null, bad);
    const p = splitTitleAndDates("Plan the launch by 05/01/2027", today);
    assert.deepEqual([p.title, p.dueOn], ["Plan the launch", "2027-01-05"]);
    const m = splitTitleAndDates("Review from 01/12/2026 by 05/01/2027", today, true);
    assert.deepEqual([m.title, m.startsOn, m.dueOn], ["Review", "2026-12-01", "2027-01-05"]);
  });
  it("rejects what is not a real date", () => {
    for (const bad of ["31 Feb", "2026-02-30", "soon", "13/13", "32 Nov", "20 Foo"]) assert.equal(parseDate(bad, today), null, bad);
  });
  it("a due date without a year is the next such day", () => {
    assert.equal(parseDate("5 Jan", today), "2027-01-05"); // today is 13 Nov 2026
    assert.equal(parseDate("13 Nov", today), "2026-11-13");
    assert.equal(parseDate("5/1", today), "2027-01-05");
    assert.equal(parseDate("5 Jan 2026", today), "2026-01-05"); // a year given is kept
  });
  it("meetings without a year never land in the future", () => {
    assert.equal(parseDate("20 Dec", today, true), "2025-12-20");
    assert.equal(parseDate("12 Nov", today, true), "2026-11-12");
  });
});

describe("splitTitleAndDates", () => {
  it("title, start and due", () => {
    assert.deepEqual(splitTitleAndDates("Prototype from 1 Dec by 15 Dec", today, true), { title: "Prototype", startsOn: "2026-12-01", dueOn: "2026-12-15", badDue: null });
    assert.equal(splitTitleAndDates("Draft deck by 20 Nov", today).dueOn, "2026-11-20");
    // A start without a year falls on or before its due date, across New Year too.
    assert.deepEqual(splitTitleAndDates("Report from 20 Dec by 5 Jan", today, true), { title: "Report", startsOn: "2026-12-20", dueOn: "2027-01-05", badDue: null });
    assert.equal(splitTitleAndDates("Kickoff from 1 Nov by 30 Nov", today, true).startsOn, "2026-11-01");
    assert.deepEqual(splitTitleAndDates("Just a title", today), { title: "Just a title", startsOn: null, dueOn: null, badDue: null });
  });
  it("keeps a non-date 'by' in the title; reports a date that is not real", () => {
    assert.deepEqual(splitTitleAndDates("Presentation by the team", today), { title: "Presentation by the team", startsOn: null, dueOn: null, badDue: null });
    assert.equal(splitTitleAndDates("Collect feedback by May", today).badDue, null);
    assert.equal(splitTitleAndDates("Draft by 31 Nov", today).badDue, "31 Nov");
  });
  it("a date on its own changes only the date", () => {
    assert.deepEqual(splitTitleAndDates("by 22 Nov", today), { title: "", startsOn: null, dueOn: "2026-11-22", badDue: null });
    assert.deepEqual(splitTitleAndDates("from 1 Dec by 15 Dec", today, true), { title: "", startsOn: "2026-12-01", dueOn: "2026-12-15", badDue: null });
  });
  it("reads 'from' only for milestones; a task keeps it in its title", () => {
    assert.deepEqual(splitTitleAndDates("Draft from 1 Dec by 20 Nov", today), { title: "Draft from 1 Dec", startsOn: null, dueOn: "2026-11-20", badDue: null });
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
