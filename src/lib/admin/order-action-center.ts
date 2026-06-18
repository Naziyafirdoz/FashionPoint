import type { AdminOrderStatsV2 } from "@/lib/orders/refund-queue";

export type NotificationSummaryCounts = {
  newOrders: number;
  readyForShipping: number;
};

export function computeNotificationSummary(
  stats: AdminOrderStatsV2,
  extra?: { readyForShipping?: number }
): NotificationSummaryCounts {
  return {
    newOrders: stats.pending + stats.processing,
    readyForShipping: extra?.readyForShipping ?? stats.readyToShip ?? 0
  };
}

export function hasNotificationSummary(counts: NotificationSummaryCounts): boolean {
  return counts.newOrders > 0 || counts.readyForShipping > 0;
}
