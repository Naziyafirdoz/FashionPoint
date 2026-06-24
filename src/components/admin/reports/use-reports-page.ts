"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLiveRefresh } from "@/lib/admin/use-live-refresh";
import { parseReportResponse } from "@/lib/admin/reports-client";
import {
  buildReportsQueryString,
  parseReportsQueryState,
  type ReportsQueryState
} from "@/lib/admin/reports-params";

export function useReportsPage<T>(endpoint: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = useMemo(() => parseReportsQueryState(searchParams), [searchParams]);

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const silentInflightRef = useRef(false);

  const updateQuery = useCallback(
    (patch: Partial<ReportsQueryState>) => {
      const qs = buildReportsQueryString(patch, query);
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, query, router]
  );

  const load = useCallback(
    async (silent = false) => {
      if (silent && silentInflightRef.current) {
        return;
      }

      if (silent) {
        silentInflightRef.current = true;
      }

      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const qs = buildReportsQueryString({}, query);
        const res = await fetch(`${endpoint}?${qs}`, { cache: "no-store" });
        const payload = await parseReportResponse<T>(res);
        setData(payload);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load report");
      } finally {
        if (silent) {
          silentInflightRef.current = false;
        }
        setLoading(false);
        setRefreshing(false);
      }
    },
    [endpoint, query]
  );

  const { lastUpdated, isLive, refresh, touch } = useLiveRefresh(() => load(true));

  const loadWithTimestamp = useCallback(
    async (silent = false) => {
      await load(silent);
      touch();
    },
    [load, touch]
  );

  useEffect(() => {
    void loadWithTimestamp();
  }, [loadWithTimestamp]);

  return {
    query,
    updateQuery,
    data,
    loading,
    refreshing,
    error,
    lastUpdated,
    isLive,
    refresh: () => void refresh()
  };
}
