import type { SupabaseClient } from "@supabase/supabase-js";
import { getDashboardData, type DashboardData } from "@/lib/admin/dashboard";

const DASHBOARD_CACHE_TTL_MS = 60_000;

type DashboardCacheEntry = {
  data: DashboardData;
  builtAt: number;
};

let cache: DashboardCacheEntry | null = null;

export function getCachedDashboardData(
  db: SupabaseClient,
  forceRefresh = false
): Promise<DashboardData> {
  if (!forceRefresh && cache && Date.now() - cache.builtAt < DASHBOARD_CACHE_TTL_MS) {
    return Promise.resolve(cache.data);
  }

  return getDashboardData(db).then((data) => {
    cache = { data, builtAt: Date.now() };
    return data;
  });
}

export function invalidateDashboardCache(): void {
  cache = null;
}
