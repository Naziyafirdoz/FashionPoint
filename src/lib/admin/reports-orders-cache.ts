import type { Order } from "@/types";

export const REPORT_ORDERS_CACHE_TTL_MS = 5 * 60 * 1000;

type ReportOrdersCacheEntry = {
  orders: Order[];
  builtAt: number;
};

const cache = new Map<string, ReportOrdersCacheEntry>();

export function buildReportOrdersCacheKey(start: Date, end: Date): string {
  return `${start.toISOString()}|${end.toISOString()}`;
}

export function getReportOrdersCache(key: string): ReportOrdersCacheEntry | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.builtAt > REPORT_ORDERS_CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return entry;
}

export function setReportOrdersCache(key: string, orders: Order[]): number {
  const builtAt = Date.now();
  cache.set(key, { orders, builtAt });
  return builtAt;
}

export function invalidateReportOrdersCache(): void {
  cache.clear();
}
