"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import type { DashboardData } from "@/lib/admin/dashboard";
import type { AdminOrderQueues } from "@/lib/admin/use-admin-order-queues";
import { useAdminNotifications } from "@/contexts/AdminNotificationsProvider";
import { customerName } from "@/lib/orders/admin-orders";
import { ActionRequiredBanner } from "./ActionRequiredBanner";
import { DashboardKpiGrid } from "./DashboardKpiGrid";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { DispatchRequiredCard } from "./DispatchRequiredCard";
import { LowStockCard } from "./LowStockCard";
import { OrderWorkflowQuickActions } from "./OrderWorkflowQuickActions";
import { PackingRequiredCard } from "./PackingRequiredCard";
import { PendingApprovalWidget } from "./PendingApprovalWidget";
import { QuickActions } from "./QuickActions";
import { RecentOrdersCard } from "./RecentOrdersCard";
import { SalesByChannelCard } from "./SalesByChannelCard";
import { SalesChartCard } from "./SalesChartCard";
import { TopSellingCard } from "./TopSellingCard";

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
  const { subscribeToOrderChanges } = useAdminNotifications();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dashboard");
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
      setLoading(false);
    }
  }, [onDataLoaded]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return subscribeToOrderChanges(({ event, order }) => {
      onOrderDataChange?.();
      if (event !== "UPDATE") return;
      setData((prev) => {
        if (!prev) return prev;
        const idx = prev.recentOrders.findIndex((row) => row.id === order.id);
        if (idx < 0) return prev;
        const recentOrders = [...prev.recentOrders];
        recentOrders[idx] = {
          ...recentOrders[idx],
          status: order.status,
          amount: Number(order.total) || recentOrders[idx].amount,
          customer: customerName(order)
        };
        return { ...prev, recentOrders };
      });
    });
  }, [subscribeToOrderChanges, onOrderDataChange]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
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
          <button type="button" onClick={load} className="btn-primary mt-6 inline-flex gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <ActionRequiredBanner pendingCount={orderQueues.pendingApprovalCount} />
      <DashboardKpiGrid kpis={data.kpis} />

      <div className="grid gap-4 md:grid-cols-2">
        <PackingRequiredCard count={orderQueues.packingRequiredCount} />
        <DispatchRequiredCard count={orderQueues.dispatchRequiredCount} />
      </div>

      <OrderWorkflowQuickActions />
      <QuickActions />

      <PendingApprovalWidget orders={orderQueues.pendingApproval} loading={orderQueues.loading} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SalesChartCard revenueTrend={data.revenueTrend} />
        </div>
        <SalesByChannelCard salesByChannel={data.salesByChannel} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentOrdersCard orders={data.recentOrders} />
        </div>
        <LowStockCard items={data.lowStock} />
      </div>

      <TopSellingCard products={data.topSelling} />
    </div>
  );
}
