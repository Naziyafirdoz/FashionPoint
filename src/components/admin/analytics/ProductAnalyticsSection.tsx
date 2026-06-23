"use client";

import { PanelCard, ProductThumb, StatCard } from "@/components/admin/analytics/analytics-shared";
import { useStoreAnalyticsContext } from "@/components/admin/analytics/store-analytics-context";

export function ProductAnalyticsSection() {
  const { products, analytics } = useStoreAnalyticsContext();
  const productsAnalytics = analytics.productAnalytics;

  if (
    products.length === 0 &&
    productsAnalytics.activeProductsCount === 0 &&
    productsAnalytics.neverSoldProducts.length === 0
  ) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold text-primary">Product Analytics</h2>
        <p className="text-xs text-foreground/55">Catalog health for the selected period</p>
      </div>

      {productsAnalytics.activeProductsCount > 0 ? (
        <StatCard
          label="Active Products"
          value={String(productsAnalytics.activeProductsCount)}
        />
      ) : null}

      {productsAnalytics.neverSoldProducts.length > 0 ? (
        <PanelCard
          title="Products Never Sold"
          subtitle="No order history for these catalog products"
        >
          <ul className="space-y-2">
            {productsAnalytics.neverSoldProducts.map((product) => (
              <li
                key={product.productId}
                className="flex items-center gap-2.5 rounded-lg border border-accent/10 bg-blush/15 px-2 py-2"
              >
                <ProductThumb image={product.image} name={product.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
                  <p className="text-[11px] text-foreground/55">
                    {product.categoryName ?? "Uncategorized"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </PanelCard>
      ) : (
        <p className="text-sm text-foreground/60">All active products have at least one sale.</p>
      )}
    </div>
  );
}
