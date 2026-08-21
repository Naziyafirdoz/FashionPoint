import { STORE_TIMEZONE } from "@/lib/site-config";

export const DAILY_PENDING_ACTION_DIGEST_EVENT = "daily_pending_action_digest";

export const DEFAULT_DAILY_PENDING_ACTION_REMINDER = {
  enabled: true,
  time: "22:30",
  timezone: STORE_TIMEZONE,
  sendOnlyIfPending: true,
  combineIntoOneEmail: true
} as const;

export type DailyPendingActionReminderSettings = {
  enabled: boolean;
  time: string;
  timezone: string;
  sendOnlyIfPending: boolean;
  combineIntoOneEmail: boolean;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

export function isValidReminderTime(value: string): boolean {
  return TIME_PATTERN.test(value.trim());
}

export function parseReminderTime(value: string): { hours: number; minutes: number } | null {
  const trimmed = value.trim();
  const match = TIME_PATTERN.exec(trimmed);
  if (!match) return null;
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

export function formatReminderTime(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function normalizeDailyPendingActionReminder(
  input: unknown
): DailyPendingActionReminderSettings {
  const source =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  const timeRaw = typeof source.time === "string" ? source.time.trim() : "";
  const parsedTime = parseReminderTime(timeRaw);
  const time = parsedTime
    ? formatReminderTime(parsedTime.hours, parsedTime.minutes)
    : DEFAULT_DAILY_PENDING_ACTION_REMINDER.time;

  return {
    enabled: source.enabled !== false,
    time,
    timezone: STORE_TIMEZONE,
    sendOnlyIfPending: source.sendOnlyIfPending !== false,
    combineIntoOneEmail: source.combineIntoOneEmail !== false
  };
}

export function parseDailyPendingActionReminderPatch(
  input: unknown
): DailyPendingActionReminderSettings | { error: string } {
  if (!input || typeof input !== "object") {
    return { error: "dailyPendingActionReminder must be an object" };
  }

  const source = input as Record<string, unknown>;

  if ("enabled" in source && typeof source.enabled !== "boolean") {
    return { error: "dailyPendingActionReminder.enabled must be a boolean" };
  }
  if ("time" in source) {
    if (typeof source.time !== "string" || !isValidReminderTime(source.time)) {
      return { error: "dailyPendingActionReminder.time must be HH:MM in 24-hour format" };
    }
  }
  if ("sendOnlyIfPending" in source && typeof source.sendOnlyIfPending !== "boolean") {
    return { error: "dailyPendingActionReminder.sendOnlyIfPending must be a boolean" };
  }
  if ("combineIntoOneEmail" in source && typeof source.combineIntoOneEmail !== "boolean") {
    return { error: "dailyPendingActionReminder.combineIntoOneEmail must be a boolean" };
  }

  return normalizeDailyPendingActionReminder(source);
}

/** YYYY-MM-DD for a Date in the given IANA timezone (default Asia/Kolkata). */
export function calendarDateInTimeZone(
  now: Date,
  timeZone: string = STORE_TIMEZONE
): string {
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

export function formatDigestDateLabel(
  now: Date,
  timeZone: string = STORE_TIMEZONE
): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(now);
}

function zonedClock(now: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(now);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hours: read("hour"),
    minutes: read("minute")
  };
}

/** True when the zoned local clock is at or after the configured HH:MM today. */
export function isAtOrAfterConfiguredTime(
  now: Date,
  timeHHmm: string,
  timeZone: string = STORE_TIMEZONE
): boolean {
  const parsed = parseReminderTime(timeHHmm);
  if (!parsed) return false;

  const clock = zonedClock(now, timeZone);
  const nowMinutes = clock.hours * 60 + clock.minutes;
  const targetMinutes = parsed.hours * 60 + parsed.minutes;
  return nowMinutes >= targetMinutes;
}

export function digestDateLogMarker(digestDate: string): string {
  return `digestDate=${digestDate}`;
}
