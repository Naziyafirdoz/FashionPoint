"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import type { DashboardData, DashboardOrderLean } from "@/lib/admin/dashboard";
import {
  DEFAULT_DASHBOARD_RANGE,
  filterDashboardByDateRange,
  type DashboardDateRangeState
} from "@/lib/admin/dashboard-date-range";
import type { AdminOrderQueues } from "@/lib/admin/use-admin-order-queues";
import { useAdminNotifications } from "@/contexts/AdminNotificationsProvider";
import { subscribeOrderSyncBus } from "@/lib/orders/order-sync-bus";
import { subscribeReviewSyncBus } from "@/lib/reviews/review-sync-bus";
import { useReviewRealtimeSync } from "@/lib/reviews/use-review-realtime-sync";
import type { Order } from "@/types";
import { ActionRequiredBanner } from "./ActionRequiredBanner";
import { CancellationRequestsCard } from "./CancellationRequestsCard";
import { DashboardDateRangeFilter } from "./DashboardDateRangeFilter";
import { DashboardKpiGrid } from "./DashboardKpiGrid";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { DispatchRequiredCard } from "./DispatchRequiredCard";
import { PackingRequiredCard } from "./PackingRequiredCard";
import { PendingApprovalWidget } from "./PendingApprovalWidget";
import { RecentOrdersCard } from "./RecentOrdersCard";
import { RefundRequestsCard } from "./RefundRequestsCard";

const SalesChartCard = dynamic(
  () => import("./SalesChartCard").then((mod) => mod.SalesChartCard),
  { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-xl bg-white/60" /> }
);

function toDashboardOrderLean(order: Order): DashboardOrderLean {
  return {
    id: order.id,
    order_number: order.order_number,
    total: order.total,
    status: order.status,
    created_at: order.created_at,
    shipping_address: order.shipping_address,
    guest_email: order.guest_email
  };
}

export function AdminDashboardClient({
  orderQueues,
  onDataLoaded,
  onOrderDataChange
}: {
  orderQueues: AdminOrderQueues;
  onDataLoaded?: () => void;
  onOrderDataChange?: () => void;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DashboardDateRangeState>({
    range: DEFAULT_DASHBOARD_RANGE,
    from: "",
    to: ""
  });
  const { subscribeToOrderChanges } = useAdminNotifications();

  const load = useCallback(async (silent = false, forceRefresh = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const suffix = forceRefresh ? "?refresh=1" : "";
      const res = await fetch(`/api/admin/dashboard${suffix}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to load dashboard");
        setData(null);
        return;
      }
      setData(json as DashboardData);
      onDataLoaded?.();
    } catch {
      setError("Unable to connect. Please try again.");
      setData(null);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [onDataLoaded]);

  const refreshDashboardData = useCallback(() => {
    void load(true, true);
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refreshDashboardData();
      }
    };

    window.addEventListener("focus", refreshDashboardData);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("focus", refreshDashboardData);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshDashboardData]);

  useEffect(() => {
    return subscribeOrderSyncBus(() => {
      refreshDashboardData();
    });
  }, [refreshDashboardData]);

  useEffect(() => {
    return subscribeReviewSyncBus(() => {
      refreshDashboardData();
    });
  }, [refreshDashboardData]);

  useReviewRealtimeSync(() => {
    refreshDashboardData();
  });

  useEffect(() => {
    return subscribeToOrderChanges(({ event, order }) => {
      onOrderDataChange?.();

      setData((prev) => {
        if (!prev) return prev;

        if (event === "INSERT") {
          const lean = toDashboardOrderLean(order);
          if (prev.ordersLean.some((row) => row.id === lean.id)) return prev;
          return { ...prev, ordersLean: [lean, ...prev.ordersLean] };
        }

        if (event !== "UPDATE") return prev;

        const ordersLean = prev.ordersLean.map((row) =>
          row.id === order.id
            ? {
                ...row,
                status: order.status,
                total: order.total,
                shipping_address: order.shipping_address,
                guest_email: order.guest_email
              }
            : row
        );

        return { ...prev, ordersLean };
      });
    });
  }, [subscribeToOrderChanges, onOrderDataChange]);

  const filtered = useMemo(
    () => (data ? filterDashboardByDateRange(data, dateRange) : null),
    [data, dateRange]
  );

  const showOperationalCards =
    orderQueues.packingRequiredCount > 0 ||
    orderQueues.dispatchRequiredCount > 0 ||
    orderQueues.cancellationRequestsCount > 0 ||
    orderQueues.refundRequestsCount > 0;

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data || !filtered) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <p className="mt-4 font-medium text-red-800">{error ?? "Something went wrong"}</p>
          <p className="mt-1 text-sm text-red-600/80">
            Check your connection and ensure you have admin access.
          </p>
          <button type="button" onClick={() => void load()} className="btn-primary mt-6 inline-flex gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <ActionRequiredBanner count={orderQueues.actionRequiredCount} />

      <DashboardDateRangeFilter
        value={dateRange}
        onChange={(patch) => setDateRange((current) => ({ ...current, ...patch }))}
      />

      <DashboardKpiGrid kpis={filtered.kpis} />

      {showOperationalCards ? (
        <div className="grid gap-4 md:grid-cols-2">
          <PackingRequiredCard count={orderQueues.packingRequiredCount} />
          <DispatchRequiredCard count={orderQueues.dispatchRequiredCount} />
          <CancellationRequestsCard count={orderQueues.cancellationRequestsCount} />
          <RefundRequestsCard count={orderQueues.refundRequestsCount} />
        </div>
      ) : null}

      {!orderQueues.loading && orderQueues.pendingApprovalCount > 0 ? (
        <PendingApprovalWidget orders={orderQueues.pendingApproval} />
      ) : null}

      <SalesChartCard data={filtered.revenueTrend} />

      <RecentOrdersCard orders={filtered.recentOrders} />
    </div>
  );
}
