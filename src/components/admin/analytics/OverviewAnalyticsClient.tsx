"use client";

import { CircleDollarSign, Package, ShoppingBag, TrendingUp } from "lucide-react";
import { AnalyticsPageShell } from "@/components/admin/analytics/AnalyticsPageShell";
import {
  AnalyticsNavCards,
  AnalyticsOverviewHeader
} from "@/components/admin/analytics/AnalyticsNavCards";
import { SalesTrendChart } from "@/components/admin/analytics/SalesAnalyticsSection";
import {
  KpiCard,
  StatCard,
  formatCurrency
} from "@/components/admin/analytics/analytics-shared";
import { useStoreAnalyticsContext } from "@/components/admin/analytics/store-analytics-context";

export function OverviewAnalyticsClient() {
  const { analytics } = useStoreAnalyticsContext();
  const { overview, orderAnalytics, productAnalytics } = analytics;

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
            icon={Package}
            label="Products Sold"
            value={String(overview.productsSold)}
          />
          <KpiCard
            icon={TrendingUp}
            label="Average Order Value"
            value={formatCurrency(overview.averageOrderValue)}
          />
        </div>

        <SalesTrendChart gradientId="overviewSalesGradient" />

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
            Quick Summary
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {productAnalytics.bestProduct ? (
              <div className="rounded-xl border border-accent/20 bg-white p-4 shadow-card">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Top Product
                </p>
                <p className="mt-2 text-sm font-bold text-foreground">
                  {productAnalytics.bestProduct.name}
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums text-primary">
                  {formatCurrency(productAnalytics.bestProduct.revenue)}
                </p>
              </div>
            ) : null}

            {orderAnalytics.completionRate.denominator > 0 ? (
              <div className="rounded-xl border border-accent/20 bg-white p-4 shadow-card">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Completion Rate
                </p>
                {orderAnalytics.completionRate.percent !== null ? (
                  <p className="mt-2 text-2xl font-bold text-primary">
                    {orderAnalytics.completionRate.percent}%
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-foreground/60">
                  {orderAnalytics.completionRate.numerator} of{" "}
                  {orderAnalytics.completionRate.denominator} non-cancelled delivered
                </p>
              </div>
            ) : null}

            {productAnalytics.activeProductsCount > 0 ? (
              <StatCard
                label="Active Products"
                value={String(productAnalytics.activeProductsCount)}
              />
            ) : null}
          </div>
        </div>

        <AnalyticsNavCards />
      </div>
    </AnalyticsPageShell>
  );
}
