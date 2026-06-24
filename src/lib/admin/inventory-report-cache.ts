import type { InventoryReportSnapshot } from "@/lib/admin/reports";

export const INVENTORY_REPORT_CACHE_TTL_MS = 5 * 60 * 1000;

export const INVENTORY_REPORT_INVALIDATING_ORDER_STATUSES = new Set([
  "confirmed",
  "shipped",
  "out_for_delivery",
  "delivered"
]);

type InventoryCacheEntry = {
  snapshot: InventoryReportSnapshot;
  builtAt: number;
};

const cache = new Map<string, InventoryCacheEntry>();

export function buildInventoryReportCacheKey(
  range: string,
  from?: string,
  to?: string
): string {
  return `${range}|${from ?? ""}|${to ?? ""}`;
}

export function getInventoryReportCache(key: string): InventoryCacheEntry | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.builtAt > INVENTORY_REPORT_CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return entry;
}

export function setInventoryReportCache(
  key: string,
  snapshot: InventoryReportSnapshot
): number {
  const builtAt = Date.now();
  cache.set(key, { snapshot, builtAt });
  return builtAt;
}

export function invalidateInventoryReportCache(cacheKey?: string): void {
  if (cacheKey) {
    cache.delete(cacheKey);
    return;
  }
  cache.clear();
}

export function shouldInvalidateInventoryReportForOrderStatus(status: string): boolean {
  return INVENTORY_REPORT_INVALIDATING_ORDER_STATUSES.has(status);
}
