"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  INVENTORY_REPORT_CACHE_TTL_MS,
  INVENTORY_REPORT_INVALIDATING_ORDER_STATUSES
} from "@/lib/admin/inventory-report-cache";
import { parseReportResponse } from "@/lib/admin/reports-client";
import {
  buildReportsQueryString,
  parseReportsQueryState,
  type ReportsQueryState
} from "@/lib/admin/reports-params";
import { useLiveRefresh } from "@/lib/admin/use-live-refresh";
import { useAdminNotifications } from "@/contexts/AdminNotificationsProvider";

const INVENTORY_ENDPOINT = "/api/admin/reports/inventory";

export function useInventoryReportsPage<T>() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = useMemo(() => parseReportsQueryState(searchParams), [searchParams]);
  const { subscribeToOrderChanges } = useAdminNotifications();

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const silentInflightRef = useRef(false);
  const isFirstLoadRef = useRef(true);

  const updateQuery = useCallback(
    (patch: Partial<ReportsQueryState>) => {
      const qs = buildReportsQueryString(patch, query);
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, query, router]
  );

  const load = useCallback(
    async (silent = false, forceRefresh = false) => {
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
        const refreshSuffix = forceRefresh ? `${qs ? "&" : ""}refresh=1` : "";
        const res = await fetch(
          qs || refreshSuffix
            ? `${INVENTORY_ENDPOINT}?${qs}${refreshSuffix}`
            : INVENTORY_ENDPOINT,
          { cache: "no-store" }
        );
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
    [query]
  );

  const { lastUpdated, isLive, refresh, touch } = useLiveRefresh(() => load(true, false), {
    intervalMs: INVENTORY_REPORT_CACHE_TTL_MS
  });

  const manualRefresh = useCallback(async () => {
    await load(true, true);
    touch();
  }, [load, touch]);

  const loadWithTimestamp = useCallback(
    async (silent = false, forceRefresh = false) => {
      await load(silent, forceRefresh);
      touch();
    },
    [load, touch]
  );

  useEffect(() => {
    const silent = !isFirstLoadRef.current;
    void loadWithTimestamp(silent).finally(() => {
      isFirstLoadRef.current = false;
    });
  }, [loadWithTimestamp]);

  useEffect(() => {
    return subscribeToOrderChanges(({ event, order, previous }) => {
      if (!INVENTORY_REPORT_INVALIDATING_ORDER_STATUSES.has(order.status)) {
        return;
      }

      if (
        event === "UPDATE" &&
        previous &&
        previous.status === order.status &&
        previous.updated_at === order.updated_at
      ) {
        return;
      }

      void loadWithTimestamp(true, true);
    });
  }, [loadWithTimestamp, subscribeToOrderChanges]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-inventory-reports")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        void loadWithTimestamp(true, true);
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_variants" },
        () => {
          void loadWithTimestamp(true, true);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
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
    refresh: manualRefresh
  };
}
