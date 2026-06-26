import { invalidateDashboardCache } from "@/lib/admin/dashboard-cache";
import { invalidateInventoryReportCache } from "@/lib/admin/inventory-report-cache";
import { invalidateReportOrdersCache } from "@/lib/admin/reports-orders-cache";

/** Clears in-memory admin/report caches after stock or fulfillment changes. */
export function invalidateAdminDataCaches(): void {
  invalidateDashboardCache();
  invalidateInventoryReportCache();
  invalidateReportOrdersCache();
}
