"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAllOrdersForAdmin } from "@/lib/admin/fetch-all-orders";
import {
  computeStoreAnalytics,
  type AnalyticsProductInput,
  type StoreAnalyticsFilter,
  type StoreAnalyticsSnapshot
} from "@/lib/admin/store-analytics";
import { useAdminNotifications } from "@/contexts/AdminNotificationsProvider";
import type { OrderRealtimeEvent } from "@/lib/admin/notifications/types";
import { useLiveTimestamp } from "@/lib/admin/use-live-timestamp";
import { applyPaymentRulesToOrder } from "@/lib/orders/payment-rules";
import type { Order } from "@/types";

function patchAnalyticsOrders(prev: Order[], { event, order }: OrderRealtimeEvent): Order[] {
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

export function useStoreAnalytics(defaultFilter: StoreAnalyticsFilter = "30d") {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<AnalyticsProductInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<StoreAnalyticsFilter>(defaultFilter);
  const { subscribeToOrderChanges } = useAdminNotifications();
  const { lastUpdated, touch } = useLiveTimestamp();

  const loadData = useCallback(async () => {
    try {
      const [orderData, productsRes] = await Promise.all([
        fetchAllOrdersForAdmin(),
        fetch("/api/admin/products", { cache: "no-store" })
      ]);

      let productRows: AnalyticsProductInput[] = [];
      if (productsRes.ok) {
        const json = (await productsRes.json()) as {
          products?: {
            id: string;
            name: string;
            images?: string[];
            status: string;
            category_id: string | null;
            category_name: string | null;
          }[];
        };
        productRows = (json.products ?? []).map((product) => ({
          id: product.id,
          name: product.name,
          images: Array.isArray(product.images) ? product.images : [],
          status: product.status,
          category_id: product.category_id,
          category_name: product.category_name
        }));
      }

      setOrders(orderData.map((o) => applyPaymentRulesToOrder(o)));
      setProducts(productRows);
      touch();
      setError(null);
    } catch {
      setError("Unable to load analytics data.");
    } finally {
      setLoading(false);
    }
  }, [touch]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    return subscribeToOrderChanges((payload) => {
      setOrders((prev) => patchAnalyticsOrders(prev, payload));
      touch();
    });
  }, [subscribeToOrderChanges, touch]);

  const analytics: StoreAnalyticsSnapshot = useMemo(
    () => computeStoreAnalytics(orders, dateFilter, products),
    [orders, dateFilter, products]
  );

  const hasOrders = orders.length > 0;
  const hasFilteredOrders = analytics.overview.totalOrders > 0;

  return {
    orders,
    products,
    loading,
    error,
    dateFilter,
    setDateFilter,
    analytics,
    lastUpdated,
    hasOrders,
    hasFilteredOrders
  };
}
