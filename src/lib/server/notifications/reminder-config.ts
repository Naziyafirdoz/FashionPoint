/** Default admin approval reminder delay (2 hours). */
export const DEFAULT_REMINDER_DELAY_MINUTES = 120;

/** Admin "Remind Me Later" delay from REMINDER_DELAY_MINUTES env (minutes). */
export function getReminderDelayMinutes(): number {
  const raw = process.env.REMINDER_DELAY_MINUTES?.trim();
  if (!raw) return DEFAULT_REMINDER_DELAY_MINUTES;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_REMINDER_DELAY_MINUTES;
  return Math.round(parsed);
}

export function formatReminderDelayLabel(minutes = getReminderDelayMinutes()): string {
  if (minutes >= 60 && minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}
