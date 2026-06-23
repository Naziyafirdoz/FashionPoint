"use client";

import type { ReactNode } from "react";
import { BarChart3 } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminLiveStatus } from "@/components/admin/AdminLiveStatus";
import { EmptyState } from "@/components/admin/dashboard/EmptyState";
import { DateFilterSelect } from "@/components/admin/analytics/analytics-shared";
import { useStoreAnalyticsContext } from "@/components/admin/analytics/store-analytics-context";

type AnalyticsPageShellProps = {
  title: string;
  children: ReactNode;
  requireOrders?: boolean;
  requireFilteredOrders?: boolean;
};

export function AnalyticsPageShell({
  title,
  children,
  requireOrders = true,
  requireFilteredOrders = true
}: AnalyticsPageShellProps) {
  const { loading, error, dateFilter, setDateFilter, lastUpdated, hasOrders, hasFilteredOrders } =
    useStoreAnalyticsContext();

  return (
    <>
      <AdminHeader
        title={title}
        action={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <AdminLiveStatus lastUpdated={lastUpdated} live />
            <DateFilterSelect value={dateFilter} onChange={setDateFilter} />
          </div>
        }
      />

      <div className="space-y-4 bg-blush/30 p-4 sm:p-6">
        {loading ? (
          <p className="text-sm text-foreground/60">Loading analytics…</p>
        ) : error ? (
          <EmptyState icon={BarChart3} title="Unable to load analytics" description={error} />
        ) : requireOrders && !hasOrders ? (
          <EmptyState
            icon={BarChart3}
            title="No order data yet"
            description="Analytics will appear once customers place orders."
          />
        ) : requireOrders && requireFilteredOrders && !hasFilteredOrders ? (
          <EmptyState
            icon={BarChart3}
            title="No data in this period"
            description="Try a wider date range to see analytics."
          />
        ) : (
          children
        )}
      </div>
    </>
  );
}
