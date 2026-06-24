"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type { AIGrowthDateFilter } from "@/components/admin/ai-growth/ai-growth-shared";
import { useAdminNotifications } from "@/contexts/AdminNotificationsProvider";
import type { OrderRealtimeEvent } from "@/lib/admin/notifications/types";
import { fetchAllOrdersForAdmin } from "@/lib/admin/fetch-all-orders";
import { useLiveRefresh } from "@/lib/admin/use-live-refresh";
import { applyPaymentRulesToOrder } from "@/lib/orders/payment-rules";
import type { Order } from "@/types";

const extraLiveRefreshRef: { current: (() => void | Promise<void>) | null } = {
  current: null
};

export function setAIGrowthLiveRefreshExtra(fn: (() => void | Promise<void>) | null) {
  extraLiveRefreshRef.current = fn;
}

function patchGrowthOrders(prev: Order[], { event, order }: OrderRealtimeEvent): Order[] {
  const nextOrder = applyPaymentRulesToOrder(order);

  if (event === "INSERT") {
    if (prev.some((row) => row.id === nextOrder.id)) return prev;
    return [nextOrder, ...prev];
  }

  const idx = prev.findIndex((row) => row.id === nextOrder.id);
  if (idx < 0) {
    return [nextOrder, ...prev];
  }

  const current = prev[idx];
  if (current.status === nextOrder.status && current.updated_at === nextOrder.updated_at) {
    return prev;
  }

  const next = [...prev];
  next[idx] = nextOrder;
  return next;
}

type AIGrowthContextValue = {
  dateFilter: AIGrowthDateFilter;
  setDateFilter: (value: AIGrowthDateFilter) => void;
  lastUpdated: Date | null;
  isLive: boolean;
  loading: boolean;
  error: string | null;
  orders: Order[];
};

const AIGrowthContext = createContext<AIGrowthContextValue | null>(null);

export function AIGrowthProvider({ children }: { children: ReactNode }) {
  const [dateFilter, setDateFilter] = useState<AIGrowthDateFilter>("30d");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { subscribeToOrderChanges } = useAdminNotifications();

  const refreshOrders = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const orderData = await fetchAllOrdersForAdmin();
      setOrders(orderData.map((order) => applyPaymentRulesToOrder(order)));
      setError(null);
    } catch {
      setError("Unable to load growth intelligence data.");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  const runLiveRefresh = useCallback(async () => {
    await refreshOrders(true);
    await extraLiveRefreshRef.current?.();
  }, [refreshOrders]);

  const { lastUpdated, isLive, touch } = useLiveRefresh(runLiveRefresh);

  useEffect(() => {
    void (async () => {
      await refreshOrders();
      touch();
    })();
  }, [refreshOrders, touch]);

  useEffect(() => {
    return subscribeToOrderChanges((payload) => {
      setOrders((prev) => patchGrowthOrders(prev, payload));
      touch();
    });
  }, [subscribeToOrderChanges, touch]);

  const value = useMemo(
    () => ({
      dateFilter,
      setDateFilter,
      lastUpdated,
      isLive,
      loading,
      error,
      orders
    }),
    [dateFilter, lastUpdated, isLive, loading, error, orders]
  );

  return <AIGrowthContext.Provider value={value}>{children}</AIGrowthContext.Provider>;
}

export function useAIGrowthContext() {
  const context = useContext(AIGrowthContext);
  if (!context) {
    throw new Error("useAIGrowthContext must be used within AIGrowthProvider");
  }
  return context;
}
