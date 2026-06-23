"use client";

import { AnalyticsPageShell } from "@/components/admin/analytics/AnalyticsPageShell";
import { OrderAnalyticsSection } from "@/components/admin/analytics/OrderAnalyticsSection";
import { useStoreAnalyticsContext } from "@/components/admin/analytics/store-analytics-context";

export function StoreOrderAnalyticsPageClient() {
  const { analytics } = useStoreAnalyticsContext();
  const hasPipeline = analytics.orderAnalytics.pipeline.length > 0;

  return (
    <AnalyticsPageShell title="Order Analytics">
      {hasPipeline ? (
        <OrderAnalyticsSection />
      ) : (
        <p className="text-sm text-foreground/60">No order status data in this period.</p>
      )}
    </AnalyticsPageShell>
  );
}
