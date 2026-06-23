"use client";

import { AnalyticsPageShell } from "@/components/admin/analytics/AnalyticsPageShell";
import { ProductAnalyticsSection } from "@/components/admin/analytics/ProductAnalyticsSection";
import { useStoreAnalyticsContext } from "@/components/admin/analytics/store-analytics-context";

export function ProductAnalyticsPageClient() {
  const { products, analytics } = useStoreAnalyticsContext();
  const { productAnalytics } = analytics;
  const hasData =
    products.length > 0 ||
    productAnalytics.topSellingProducts.length > 0 ||
    productAnalytics.activeProductsCount > 0;

  return (
    <AnalyticsPageShell title="Product Analytics">
      {hasData ? (
        <ProductAnalyticsSection />
      ) : (
        <p className="text-sm text-foreground/60">No product analytics data in this period.</p>
      )}
    </AnalyticsPageShell>
  );
}
