"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  Package,
  PackageCheck,
  PackageX,
  TrendingDown,
  TrendingUp
} from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminLiveStatus } from "@/components/admin/AdminLiveStatus";
import { EmptyState } from "@/components/admin/dashboard/EmptyState";
import {
  CHART_HEIGHT,
  KpiCard,
  PanelCard,
  StatCard,
  formatCompactCurrency,
  formatCurrency
} from "@/components/admin/analytics/analytics-shared";
import { fetchAllOrdersForAdmin } from "@/lib/admin/fetch-all-orders";
import {
  computeInventoryAnalytics,
  type InventoryAnalyticsSnapshot,
  type InventoryProductRow,
  type RestockPriorityRow
} from "@/lib/admin/inventory-analytics";
import type { InventoryStatus } from "@/lib/admin/inventory";
import { useLiveTimestamp } from "@/lib/admin/use-live-timestamp";
import { applyPaymentRulesToOrder } from "@/lib/orders/payment-rules";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/types";

const STOCK_COLORS: Record<InventoryStatus, string> = {
  in_stock: "#22c55e",
  low_stock: "#f97316",
  out_of_stock: "#ef4444"
};

const PRIORITY_STYLES: Record<RestockPriorityRow["priority"], string> = {
  critical: "bg-red-100 text-red-800",
  low: "bg-amber-100 text-amber-800",
  healthy: "bg-green-100 text-green-800"
};

const CATEGORY_COLORS = [
  "#7b0d2b",
  "#c9a227",
  "#6366f1",
  "#10b981",
  "#f97316",
  "#3b82f6",
  "#8b5cf6"
];

function ProductThumb({ image, name }: { image?: string; name: string }) {
  return (
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-white">
      {image ? (
        <Image src={image} alt="" fill className="object-cover" sizes="40px" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-foreground/30">
          <Package className="h-4 w-4" aria-hidden />
        </span>
      )}
    </div>
  );
}

function InventoryProductListItem({
  product,
  detail
}: {
  product: InventoryProductRow;
  detail: ReactNode;
}) {
  return (
    <li className="flex items-center gap-2.5 rounded-lg border border-accent/10 bg-blush/15 px-2 py-2">
      <ProductThumb image={product.image} name={product.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
        <p className="text-[11px] text-foreground/55">{detail}</p>
      </div>
    </li>
  );
}

function StockHealthCharts({
  data,
  title,
  subtitle
}: {
  data: InventoryAnalyticsSnapshot["stockHealth"];
  title: string;
  subtitle: string;
}) {
  if (data.length === 0) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <PanelCard title={title} subtitle={subtitle}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0d8e4" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={108} />
            <Tooltip
              formatter={(value: number, _name, item) => {
                const row = item.payload as { count: number; percentage: number };
                return [`${value}% (${row.count} products)`, "Share"];
              }}
            />
            <Bar dataKey="percentage" radius={[0, 4, 4, 0]} maxBarSize={22}>
              {data.map((entry) => (
                <Cell key={entry.key} fill={STOCK_COLORS[entry.key]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </PanelCard>

      <PanelCard title="Stock Breakdown" subtitle="Product count by health status">
        <div className="flex h-full flex-col items-center justify-center gap-4 sm:flex-row">
          <div className="h-[11rem] w-full max-w-[11rem]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={58}
                  paddingAngle={2}
                >
                  {data.map((entry) => (
                    <Cell key={entry.key} fill={STOCK_COLORS[entry.key]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="min-w-0 flex-1 space-y-1.5">
            {data.map((entry) => (
              <li
                key={entry.key}
                className="flex items-center justify-between gap-2 text-xs text-foreground/70"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: STOCK_COLORS[entry.key] }}
                  />
                  <span className="truncate">{entry.label}</span>
                </span>
                <span className="font-semibold tabular-nums text-primary">
                  {entry.count} ({entry.percentage}%)
                </span>
              </li>
            ))}
          </ul>
        </div>
      </PanelCard>
    </div>
  );
}

export function InventoryAnalyticsPageClient() {
  const [products, setProducts] = useState<
    {
      id: string;
      name: string;
      images: string[];
      status: string;
      price: number;
      category_id: string | null;
      category_name: string | null;
      total_stock: number;
    }[]
  >([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeLive, setRealtimeLive] = useState(false);
  const { lastUpdated, touch } = useLiveTimestamp();

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    try {
      const [productsRes, orderData] = await Promise.all([
        fetch("/api/admin/products", { cache: "no-store" }),
        fetchAllOrdersForAdmin()
      ]);

      if (!productsRes.ok) throw new Error("Unable to load products");

      const json = (await productsRes.json()) as {
        products?: {
          id: string;
          name: string;
          images?: string[];
          status: string;
          price: number;
          category_id: string | null;
          category_name: string | null;
          total_stock: number;
        }[];
      };

      setProducts(
        (json.products ?? []).map((product) => ({
          id: product.id,
          name: product.name,
          images: Array.isArray(product.images) ? product.images : [],
          status: product.status,
          price: Number(product.price) || 0,
          category_id: product.category_id,
          category_name: product.category_name,
          total_stock: Number(product.total_stock) || 0
        }))
      );
      setOrders(orderData.map((o) => applyPaymentRulesToOrder(o)));
      touch();
      setError(null);
    } catch {
      setError("Unable to load inventory analytics.");
    } finally {
      setLoading(false);
    }
  }, [touch]);

  useEffect(() => {
    void load(true);
  }, [load]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-inventory-analytics")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        void load(false);
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_variants" },
        () => {
          void load(false);
        }
      )
      .subscribe((status) => {
        setRealtimeLive(status === "SUBSCRIBED");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const analytics: InventoryAnalyticsSnapshot = useMemo(
    () => computeInventoryAnalytics(products, orders),
    [products, orders]
  );

  const hasProducts = analytics.overview.totalProducts > 0;

  return (
    <>
      <AdminHeader
        title="Inventory Analytics"
        action={<AdminLiveStatus lastUpdated={lastUpdated} live={realtimeLive} />}
      />

      <div className="space-y-4 bg-blush/30 p-4 sm:p-6">
        {loading ? (
          <p className="text-sm text-foreground/60">Loading inventory analytics…</p>
        ) : error ? (
          <EmptyState icon={Boxes} title="Unable to load inventory analytics" description={error} />
        ) : !hasProducts ? (
          <EmptyState
            icon={Boxes}
            title="No products yet"
            description="Inventory analytics will appear once products are added to the catalog."
          />
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-lg font-bold text-primary">Inventory Analytics</h2>
              <p className="text-xs text-foreground/55">
                Stock health and inventory value from real product data
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <KpiCard
                icon={Boxes}
                label="Total Products"
                value={String(analytics.overview.totalProducts)}
              />
              <KpiCard
                icon={PackageCheck}
                label="Active Products"
                value={String(analytics.overview.activeProducts)}
              />
              <KpiCard
                icon={AlertTriangle}
                label="Low Stock Products"
                value={String(analytics.overview.lowStockProducts)}
              />
              <KpiCard
                icon={PackageX}
                label="Out of Stock Products"
                value={String(analytics.overview.outOfStockProducts)}
              />
              <KpiCard
                icon={CircleDollarSign}
                label="Total Inventory Value"
                value={formatCurrency(analytics.overview.totalInventoryValue)}
              />
            </div>

            <StockHealthCharts
              data={analytics.stockHealth}
              title="Stock Health"
              subtitle="Healthy, low stock, and out of stock products"
            />

            <div className="grid gap-4 lg:grid-cols-2">
              {analytics.lowStockProducts.length > 0 ? (
                <PanelCard title="Low Stock Products" subtitle="Stock between 1 and 5">
                  <ul className="space-y-2">
                    {analytics.lowStockProducts.map((product) => (
                      <InventoryProductListItem
                        key={product.productId}
                        product={product}
                        detail={
                          <>
                            {product.categoryName ?? "Uncategorized"} · {product.stock} in stock
                          </>
                        }
                      />
                    ))}
                  </ul>
                </PanelCard>
              ) : null}

              {analytics.outOfStockProducts.length > 0 ? (
                <PanelCard title="Out of Stock Products" subtitle="Zero stock remaining">
                  <ul className="space-y-2">
                    {analytics.outOfStockProducts.map((product) => (
                      <InventoryProductListItem
                        key={product.productId}
                        product={product}
                        detail={product.categoryName ?? "Uncategorized"}
                      />
                    ))}
                  </ul>
                </PanelCard>
              ) : null}
            </div>

            {analytics.inventoryValue.total > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
                  Inventory Value
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <StatCard
                    label="Total Inventory Value"
                    value={formatCurrency(analytics.inventoryValue.total)}
                  />
                  {analytics.inventoryValue.highest ? (
                    <div className="rounded-xl border border-accent/20 bg-white p-4 shadow-card">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Highest Value Product
                      </p>
                      <p className="mt-2 text-sm font-bold text-foreground">
                        {analytics.inventoryValue.highest.name}
                      </p>
                      <p className="mt-1 text-xl font-bold text-primary">
                        {formatCurrency(analytics.inventoryValue.highest.inventoryValue)}
                      </p>
                    </div>
                  ) : null}
                  {analytics.inventoryValue.lowest ? (
                    <div className="rounded-xl border border-accent/20 bg-white p-4 shadow-card">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Lowest Value Product
                      </p>
                      <p className="mt-2 text-sm font-bold text-foreground">
                        {analytics.inventoryValue.lowest.name}
                      </p>
                      <p className="mt-1 text-xl font-bold text-primary">
                        {formatCurrency(analytics.inventoryValue.lowest.inventoryValue)}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {analytics.categoryInventory.length > 0 ? (
              <PanelCard title="Category Inventory" subtitle="Sorted by inventory value">
                <div className="grid gap-4 lg:grid-cols-2">
                  <ul className="space-y-2">
                    {analytics.categoryInventory.map((row) => (
                      <li
                        key={row.categoryId}
                        className="rounded-lg border border-accent/10 bg-blush/15 px-3 py-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">{row.name}</p>
                          <p className="shrink-0 text-sm font-bold text-primary">
                            {formatCurrency(row.inventoryValue)}
                          </p>
                        </div>
                        <p className="mt-1 text-[11px] text-foreground/55">
                          {row.productCount}{" "}
                          {row.productCount === 1 ? "product" : "products"} · {row.unitsAvailable}{" "}
                          units available
                        </p>
                      </li>
                    ))}
                  </ul>
                  <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                    <BarChart
                      data={analytics.categoryInventory}
                      layout="vertical"
                      margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0d8e4" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => formatCompactCurrency(Number(v))}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        width={100}
                      />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), "Inventory value"]}
                      />
                      <Bar dataKey="inventoryValue" radius={[0, 4, 4, 0]} maxBarSize={20}>
                        {analytics.categoryInventory.map((entry, index) => (
                          <Cell
                            key={entry.categoryId}
                            fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </PanelCard>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              {analytics.fastMovingProducts.length > 0 ? (
                <PanelCard title="Fast Moving Products" subtitle="Highest units sold">
                  <ul className="space-y-2">
                    {analytics.fastMovingProducts.map((product) => (
                      <li
                        key={product.productId}
                        className="flex items-center gap-2.5 rounded-lg border border-accent/10 bg-blush/15 px-2 py-2"
                      >
                        <ProductThumb image={product.image} name={product.name} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {product.name}
                          </p>
                          <p className="text-[11px] text-foreground/55">
                            {product.unitsSold} sold · {product.currentStock} in stock
                          </p>
                        </div>
                        <TrendingUp className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                      </li>
                    ))}
                  </ul>
                </PanelCard>
              ) : null}

              {analytics.slowMovingProducts.length > 0 ? (
                <PanelCard
                  title="Slow Moving Products"
                  subtitle="Low sales with remaining stock (sales history required)"
                >
                  <ul className="space-y-2">
                    {analytics.slowMovingProducts.map((product) => (
                      <li
                        key={product.productId}
                        className="flex items-center gap-2.5 rounded-lg border border-accent/10 bg-blush/15 px-2 py-2"
                      >
                        <ProductThumb image={product.image} name={product.name} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {product.name}
                          </p>
                          <p className="text-[11px] text-foreground/55">
                            {product.unitsSold} sold · {product.currentStock} in stock
                          </p>
                        </div>
                        <TrendingDown className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                      </li>
                    ))}
                  </ul>
                </PanelCard>
              ) : null}
            </div>

            {analytics.restockPriority.length > 0 ? (
              <PanelCard title="Restock Priority" subtitle="Critical and low stock products">
                <ul className="space-y-2">
                  {analytics.restockPriority.map((product) => (
                    <li
                      key={product.productId}
                      className="flex items-center gap-2.5 rounded-lg border border-accent/10 bg-blush/15 px-2 py-2"
                    >
                      <ProductThumb image={product.image} name={product.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {product.name}
                        </p>
                        <p className="text-[11px] text-foreground/55">{product.stock} in stock</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLES[product.priority]}`}
                      >
                        {product.priorityLabel}
                      </span>
                    </li>
                  ))}
                </ul>
              </PanelCard>
            ) : null}

            <StockHealthCharts
              data={analytics.stockDistribution}
              title="Stock Distribution"
              subtitle="Percentage share by stock health"
            />
          </div>
        )}
      </div>
    </>
  );
}
