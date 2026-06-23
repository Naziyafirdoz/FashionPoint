"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  PackageX
} from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminLiveStatus } from "@/components/admin/AdminLiveStatus";
import { EmptyState } from "@/components/admin/dashboard/EmptyState";
import {
  CHART_HEIGHT,
  KpiCard,
  PanelCard,
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

function StockHealthChart({ data }: { data: InventoryAnalyticsSnapshot["stockHealth"] }) {
  if (data.length === 0) return null;

  return (
    <PanelCard title="Stock Health" subtitle="Healthy, low stock, and out of stock products">
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

  const analytics = useMemo(
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
                Stock health and restock priorities from your catalog
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                icon={Boxes}
                label="Total Products"
                value={String(analytics.overview.totalProducts)}
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

            <StockHealthChart data={analytics.stockHealth} />

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
          </div>
        )}
      </div>
    </>
  );
}
