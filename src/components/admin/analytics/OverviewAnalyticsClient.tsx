"use client";

import { CircleDollarSign, Package, ShoppingBag, TrendingUp } from "lucide-react";
import { AnalyticsPageShell } from "@/components/admin/analytics/AnalyticsPageShell";
import {
  AnalyticsNavCards,
  AnalyticsOverviewHeader
} from "@/components/admin/analytics/AnalyticsNavCards";
import { SalesTrendChart } from "@/components/admin/analytics/SalesAnalyticsSection";
import { KpiCard, formatCurrency } from "@/components/admin/analytics/analytics-shared";
import { useStoreAnalyticsContext } from "@/components/admin/analytics/store-analytics-context";

export function OverviewAnalyticsClient() {
  const { analytics } = useStoreAnalyticsContext();
  const { overview, productAnalytics } = analytics;

  return (
    <AnalyticsPageShell title="Analytics Overview">
      <div className="space-y-4">
        <AnalyticsOverviewHeader />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={CircleDollarSign}
            label="Total Revenue"
            value={formatCurrency(overview.totalRevenue)}
          />
          <KpiCard
            icon={ShoppingBag}
            label="Total Orders"
            value={String(overview.totalOrders)}
          />
          <KpiCard
            icon={TrendingUp}
            label="Average Order Value"
            value={formatCurrency(overview.averageOrderValue)}
          />
          <KpiCard
            icon={Package}
            label="Active Products"
            value={String(productAnalytics.activeProductsCount)}
          />
        </div>

        <SalesTrendChart gradientId="overviewSalesGradient" />

        <AnalyticsNavCards />
      </div>
    </AnalyticsPageShell>
  );
}
