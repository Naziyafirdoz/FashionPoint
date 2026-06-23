"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  logCustomerOrdersBatch,
  reconcileCustomerOrdersFromFetch,
  sortCustomerOrders
} from "@/lib/orders/merge-customer-order-list";
import type { Order } from "@/types";

/** Shared key for future React Query / SWR integrations. */
export const CUSTOMER_ORDERS_QUERY_KEY = ["orders"] as const;

const MAX_FETCH_RETRIES = 2;
const FETCH_RETRY_DELAY_MS = 500;
const FOCUS_DEBOUNCE_MS = 800;

type UseCustomerOrdersFetchOptions = {
  enabled?: boolean;
  /** Poll interval while tab is visible (ms). 0 disables polling. */
  pollIntervalMs?: number;
  /** SSR already provided orders — render immediately, refresh in background. */
  hasInitialData?: boolean;
};

type FetchOrdersOptions = {
  background?: boolean;
  /** Retry after a prior network failure (e.g. user cancelled an order). */
  force?: boolean;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch all customer orders from the API (database source of truth).
 * SSR orders render immediately; API refresh is non-blocking.
 */
export function useCustomerOrdersFetch(
  setOrders: Dispatch<SetStateAction<Order[]>>,
  options?: UseCustomerOrdersFetchOptions
) {
  const enabled = options?.enabled ?? true;
  const pollIntervalMs = options?.pollIntervalMs ?? 0;
  const hasInitialData = options?.hasInitialData ?? false;
  const inFlightRef = useRef(false);
  const hasSuccessfulFetchRef = useRef(false);
  const fetchFailedRef = useRef(false);
  const focusDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLoading, setIsLoading] = useState(!hasInitialData);
  const [hasFetched, setHasFetched] = useState(hasInitialData);

  const fetchOrders = useCallback(
    async (fetchOptions?: FetchOrdersOptions) => {
      if (!enabled) return;
      if (inFlightRef.current) return;
      if (fetchFailedRef.current && !fetchOptions?.force) return;

      const background = fetchOptions?.background ?? hasInitialData;
      if (background) {
        console.info("[orders] background refresh");
      }

      inFlightRef.current = true;
      let attempt = 0;
      let succeeded = false;

      try {
        while (attempt < MAX_FETCH_RETRIES) {
          attempt += 1;

          try {
            const res = await fetch("/api/orders?limit=20", {
              cache: "no-store",
              credentials: "include"
            });
            const data = (await res.json().catch(() => ({}))) as {
              orders?: Order[];
              error?: string;
            };

            if (!res.ok) {
              if (attempt < MAX_FETCH_RETRIES) {
                await delay(FETCH_RETRY_DELAY_MS * attempt);
                continue;
              }
              fetchFailedRef.current = true;
              console.info("[orders] fetch failed but keeping existing orders", {
                status: res.status,
                error: data.error ?? res.status
              });
              break;
            }

            const list = sortCustomerOrders(data.orders ?? []);
            logCustomerOrdersBatch(list, "fetch");
            setOrders((prev) => reconcileCustomerOrdersFromFetch(prev, list));
            console.info("[orders] fetch success", { count: list.length });
            succeeded = true;
            hasSuccessfulFetchRef.current = true;
            fetchFailedRef.current = false;
            break;
          } catch (err) {
            if (attempt < MAX_FETCH_RETRIES) {
              await delay(FETCH_RETRY_DELAY_MS * attempt);
              continue;
            }
            fetchFailedRef.current = true;
            console.info("[orders] fetch failed but keeping existing orders", { err });
          }
        }
      } finally {
        inFlightRef.current = false;
        if (!hasInitialData) {
          setIsLoading(false);
          setHasFetched(true);
        }
      }

      return succeeded;
    },
    [enabled, hasInitialData, setOrders]
  );

  const scheduleBackgroundRefresh = useCallback(() => {
    if (focusDebounceRef.current) {
      clearTimeout(focusDebounceRef.current);
    }
    focusDebounceRef.current = setTimeout(() => {
      void fetchOrders({ background: true });
    }, FOCUS_DEBOUNCE_MS);
  }, [fetchOrders]);

  useEffect(() => {
    if (!enabled) return;

    // TEMP: skip client /api/orders when SSR already provided orders (pool flooding debug).
    if (hasInitialData) return;

    void fetchOrders({ background: false });
  }, [enabled, fetchOrders, hasInitialData]);

  // TEMP: focus/visibility refresh disabled while debugging pool flooding.
  // useEffect(() => {
  //   if (!enabled) return;
  //   const onFocus = () => scheduleBackgroundRefresh();
  //   const onVisibility = () => {
  //     if (document.visibilityState === "visible") {
  //       scheduleBackgroundRefresh();
  //     }
  //   };
  //   window.addEventListener("focus", onFocus);
  //   document.addEventListener("visibilitychange", onVisibility);
  //   return () => {
  //     if (focusDebounceRef.current) {
  //       clearTimeout(focusDebounceRef.current);
  //     }
  //     window.removeEventListener("focus", onFocus);
  //     document.removeEventListener("visibilitychange", onVisibility);
  //   };
  // }, [enabled, scheduleBackgroundRefresh]);

  useEffect(() => {
    if (!enabled || pollIntervalMs <= 0) return;

    const tick = () => {
      if (!hasSuccessfulFetchRef.current) return;
      if (document.visibilityState === "visible" && !inFlightRef.current) {
        void fetchOrders({ background: true });
      }
    };

    const id = window.setInterval(tick, pollIntervalMs);
    return () => window.clearInterval(id);
  }, [enabled, fetchOrders, pollIntervalMs]);

  return { fetchOrders, isLoading, hasFetched, queryKey: CUSTOMER_ORDERS_QUERY_KEY };
}
