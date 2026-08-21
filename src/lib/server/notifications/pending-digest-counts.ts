export type DailyPendingActionCounts = {
  newOrders: number;
  lowStock: number;
  outOfStock: number;
  cancellationRequests: number;
  refundPending: number;
  total: number;
};

export const DAILY_PENDING_ACTION_KEYS = [
  "newOrders",
  "lowStock",
  "outOfStock",
  "cancellationRequests",
  "refundPending"
] as const;

export type DailyPendingActionKey = (typeof DAILY_PENDING_ACTION_KEYS)[number];

export function nonZeroPendingActionKeys(
  counts: DailyPendingActionCounts
): DailyPendingActionKey[] {
  return DAILY_PENDING_ACTION_KEYS.filter((key) => counts[key] > 0);
}

export function sumPendingActionCounts(
  counts: Omit<DailyPendingActionCounts, "total">
): number {
  return DAILY_PENDING_ACTION_KEYS.reduce((sum, key) => sum + counts[key], 0);
}
