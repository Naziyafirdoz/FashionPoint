"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  CATEGORY_COLORS,
  CHART_HEIGHT,
  PanelCard,
  ProductListRow,
  ProductThumb,
  StatCard,
  formatCompactCurrency,
  formatCurrency
} from "@/components/admin/analytics/analytics-shared";
import { useStoreAnalyticsContext } from "@/components/admin/analytics/store-analytics-context";

export function ProductAnalyticsSection() {
  const { products, analytics } = useStoreAnalyticsContext();
  const productsAnalytics = analytics.productAnalytics;

  if (
    products.length === 0 &&
    productsAnalytics.topSellingProducts.length === 0 &&
    productsAnalytics.activeProductsCount === 0
  ) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold text-primary">Product Analytics</h2>
        <p className="text-xs text-foreground/55">
          Product performance and category insights for the selected period
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {productsAnalytics.bestProduct ? (
          <div className="rounded-xl border border-accent/20 bg-white p-4 shadow-card sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Best Product</p>
            <p className="mt-2 text-lg font-bold text-foreground">
              {productsAnalytics.bestProduct.name}
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-primary">
              {formatCurrency(productsAnalytics.bestProduct.revenue)}
            </p>
            <p className="mt-1 text-sm text-foreground/60">
              {productsAnalytics.bestProduct.quantitySold}{" "}
              {productsAnalytics.bestProduct.quantitySold === 1 ? "unit" : "units"} sold
            </p>
          </div>
        ) : null}

        {productsAnalytics.activeProductsCount > 0 ? (
          <StatCard
            label="Active Products"
            value={String(productsAnalytics.activeProductsCount)}
          />
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {productsAnalytics.topSellingProducts.length > 0 ? (
          <PanelCard title="Top Selling Products" subtitle="Sorted by revenue">
            <ul className="space-y-2">
              {productsAnalytics.topSellingProducts.map((product, index) => (
                <ProductListRow
                  key={product.productId}
                  product={product}
                  index={index}
                  detail={
                    <>
                      {product.quantitySold} sold · {formatCurrency(product.revenue)}
                    </>
                  }
                />
              ))}
            </ul>
          </PanelCard>
        ) : null}

        {productsAnalytics.mostOrderedProducts.length > 0 ? (
          <PanelCard title="Most Ordered Products" subtitle="Sorted by units sold">
            <ul className="space-y-2">
              {productsAnalytics.mostOrderedProducts.slice(0, 8).map((product, index) => (
                <ProductListRow
                  key={product.productId}
                  product={product}
                  index={index}
                  detail={
                    <>
                      {product.quantitySold}{" "}
                      {product.quantitySold === 1 ? "unit" : "units"} sold
                    </>
                  }
                />
              ))}
            </ul>
          </PanelCard>
        ) : null}
      </div>

      {productsAnalytics.revenueContribution.length > 0 ? (
        <PanelCard
          title="Product Revenue Contribution"
          subtitle="Share of total revenue in this period"
        >
          <ul className="space-y-2">
            {productsAnalytics.revenueContribution.map((product) => (
              <li
                key={product.productId}
                className="flex items-center justify-between gap-3 rounded-lg border border-accent/10 bg-blush/15 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <ProductThumb image={product.image} name={product.name} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
                    <p className="text-[11px] text-foreground/55">
                      {formatCurrency(product.revenue)}
                    </p>
                  </div>
                </div>
                {product.revenueSharePercent !== null ? (
                  <p className="shrink-0 text-sm font-bold text-primary">
                    {product.revenueSharePercent}% of total revenue
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </PanelCard>
      ) : null}

      {productsAnalytics.top10ByRevenue.length > 0 ? (
        <PanelCard title="Top 10 Products" subtitle="Revenue by product">
          <ResponsiveContainer width="100%" height={Math.max(CHART_HEIGHT, 280)}>
            <BarChart
              data={productsAnalytics.top10ByRevenue}
              layout="vertical"
              margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0d8e4" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => formatCompactCurrency(Number(v))}
              />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
              <Tooltip formatter={(value: number) => [formatCurrency(value), "Revenue"]} />
              <Bar dataKey="revenue" fill="#7b0d2b" radius={[0, 4, 4, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </PanelCard>
      ) : null}

      {productsAnalytics.slowMovingProducts.length >= 2 ? (
        <PanelCard
          title="Slow Moving Products"
          subtitle="Lowest performers among products with sales history"
        >
          <ul className="space-y-2">
            {productsAnalytics.slowMovingProducts.map((product) => (
              <ProductListRow
                key={product.productId}
                product={product}
                detail={
                  <>
                    {product.quantitySold} sold · {formatCurrency(product.revenue)} ·{" "}
                    {product.orderCount} {product.orderCount === 1 ? "order" : "orders"}
                  </>
                }
              />
            ))}
          </ul>
        </PanelCard>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {productsAnalytics.categoryPerformance.length > 0 ? (
          <PanelCard title="Category Performance" subtitle="Sorted by revenue">
            <ul className="space-y-2">
              {productsAnalytics.categoryPerformance.map((row) => (
                <li
                  key={row.categoryId}
                  className="rounded-lg border border-accent/10 bg-blush/15 px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{row.name}</p>
                    <p className="shrink-0 text-sm font-bold text-primary">
                      {formatCurrency(row.revenue)}
                    </p>
                  </div>
                  <p className="mt-1 text-[11px] text-foreground/55">
                    {row.orders} {row.orders === 1 ? "order" : "orders"} · {row.unitsSold}{" "}
                    {row.unitsSold === 1 ? "unit" : "units"} sold
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/80">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.round(
                          (row.revenue / productsAnalytics.categoryPerformance[0].revenue) * 100
                        )}%`
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </PanelCard>
        ) : null}

        {productsAnalytics.categoryDistribution.length > 0 ? (
          <PanelCard title="Category Distribution" subtitle="Revenue share by category">
            <div className="flex h-full flex-col items-center justify-center gap-4 sm:flex-row">
              <div className="h-[11rem] w-full max-w-[11rem]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={productsAnalytics.categoryDistribution}
                      dataKey="revenue"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={58}
                      paddingAngle={2}
                    >
                      {productsAnalytics.categoryDistribution.map((entry, index) => (
                        <Cell
                          key={entry.categoryId}
                          fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, _name, item) => {
                        const row = item.payload as { percentage: number };
                        return [`${formatCurrency(value)} (${row.percentage}%)`, "Revenue"];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="min-w-0 flex-1 space-y-1.5">
                {productsAnalytics.categoryDistribution.map((entry, index) => (
                  <li
                    key={entry.categoryId}
                    className="flex items-center justify-between gap-2 text-xs text-foreground/70"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
                        }}
                      />
                      <span className="truncate">{entry.name}</span>
                    </span>
                    <span className="font-semibold tabular-nums text-primary">
                      {entry.percentage}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </PanelCard>
        ) : null}
      </div>

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
      ) : null}
    </div>
  );
}
