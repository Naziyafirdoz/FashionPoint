import assert from "node:assert/strict";
import {
  nonZeroPendingActionKeys,
  sumPendingActionCounts,
  type DailyPendingActionCounts
} from "../src/lib/server/notifications/pending-digest-counts.ts";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseReminderTime(value: string): { hours: number; minutes: number } | null {
  const match = TIME_PATTERN.exec(value.trim());
  if (!match) return null;
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

function calendarDateInTimeZone(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function zonedClock(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(now);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { hours: read("hour"), minutes: read("minute") };
}

function isAtOrAfterConfiguredTime(now: Date, timeHHmm: string, timeZone: string): boolean {
  const parsed = parseReminderTime(timeHHmm);
  if (!parsed) return false;
  const clock = zonedClock(now, timeZone);
  return clock.hours * 60 + clock.minutes >= parsed.hours * 60 + parsed.minutes;
}

let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL  ${name}`);
    console.error(err);
  }
}

test("pending-digest-counts omit zeros and sum live totals", () => {
  const oneCategory: DailyPendingActionCounts = {
    newOrders: 2,
    lowStock: 0,
    outOfStock: 0,
    cancellationRequests: 0,
    refundPending: 0,
    total: 2
  };
  assert.deepEqual(nonZeroPendingActionKeys(oneCategory), ["newOrders"]);

  const multi: DailyPendingActionCounts = {
    newOrders: 2,
    lowStock: 4,
    outOfStock: 2,
    cancellationRequests: 1,
    refundPending: 0,
    total: 9
  };
  assert.deepEqual(nonZeroPendingActionKeys(multi), [
    "newOrders",
    "lowStock",
    "outOfStock",
    "cancellationRequests"
  ]);
  assert.equal(sumPendingActionCounts(multi), 9);
  assert.equal(
    nonZeroPendingActionKeys({
      newOrders: 0,
      lowStock: 0,
      outOfStock: 0,
      cancellationRequests: 0,
      refundPending: 0,
      total: 0
    }).length,
    0
  );
});

test("IST calendar date is used, not UTC date", () => {
  const utcEvening = new Date("2026-08-19T21:00:00.000Z");
  assert.equal(calendarDateInTimeZone(utcEvening, "Asia/Kolkata"), "2026-08-20");
  assert.equal(calendarDateInTimeZone(utcEvening, "UTC"), "2026-08-19");
});

test("configured 22:30 IST maps to 17:00 UTC", () => {
  const before = new Date("2026-08-19T16:59:00.000Z");
  const at = new Date("2026-08-19T17:00:00.000Z");
  const after = new Date("2026-08-19T17:01:00.000Z");
  assert.equal(isAtOrAfterConfiguredTime(before, "22:30", "Asia/Kolkata"), false);
  assert.equal(isAtOrAfterConfiguredTime(at, "22:30", "Asia/Kolkata"), true);
  assert.equal(isAtOrAfterConfiguredTime(after, "22:30", "Asia/Kolkata"), true);
});

test("duplicate protection key is per IST calendar day", () => {
  const first = calendarDateInTimeZone(new Date("2026-08-19T17:00:00.000Z"), "Asia/Kolkata");
  const second = calendarDateInTimeZone(new Date("2026-08-19T17:05:00.000Z"), "Asia/Kolkata");
  const nextDay = calendarDateInTimeZone(new Date("2026-08-20T17:00:00.000Z"), "Asia/Kolkata");
  assert.equal(first, second);
  assert.equal(first, "2026-08-19");
  assert.equal(nextDay, "2026-08-20");
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}

console.log("\nAll daily pending digest unit tests passed.");
