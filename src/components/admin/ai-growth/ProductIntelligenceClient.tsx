"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { CircleDollarSign, Package, ShoppingBag, TrendingUp } from "lucide-react";
import { AIGrowthPageShell } from "@/components/admin/ai-growth/AIGrowthPageShell";
import {
  AIGrowthEmptyState,
  AIGrowthInsightRow,
  AIGrowthSectionHeader
} from "@/components/admin/ai-growth/ai-growth-shared";
import { useAIGrowthContext } from "@/components/admin/ai-growth/ai-growth-context";
import { useAdminNotifications } from "@/contexts/AdminNotificationsProvider";
import type { OrderRealtimeEvent } from "@/lib/admin/notifications/types";
import { fetchAllOrdersWithItemsForAdmin } from "@/lib/admin/fetch-all-orders";
import { applyPaymentRulesToOrder } from "@/lib/orders/payment-rules";
import type { Order } from "@/types";
import {
  CATEGORY_COLORS,
  CHART_HEIGHT,
  KpiCard,
  PanelCard,
  formatCompactCurrency,
  formatCurrency
} from "@/components/admin/analytics/analytics-shared";
import {
  computeProductIntelligence,
  type ProductCatalogInput,
  type ProductSalesRow,
  type SlowMovingProductRow
} from "@/lib/ai-growth/product-intelligence";

function patchProductOrders(prev: Order[], { event, order }: OrderRealtimeEvent): Order[] {
  const nextOrder = applyPaymentRulesToOrder(order);

  if (event === "INSERT") {
    if (prev.some((row) => row.id === nextOrder.id)) return prev;
    return [nextOrder, ...prev];
  }

  const idx = prev.findIndex((row) => row.id === nextOrder.id);
  if (idx < 0) {
    return [nextOrder, ...prev];
  }

  const current = prev[idx];
  if (current.status === nextOrder.status && current.updated_at === nextOrder.updated_at) {
    return prev;
  }

  const next = [...prev];
  next[idx] = nextOrder;
  return next;
}

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

function ProductSalesListRow({
  product,
  rank,
  detail
}: {
  product: ProductSalesRow;
  rank?: number;
  detail: string;
}) {
  return (
    <li className="flex items-center gap-2.5 rounded-lg border border-accent/10 bg-blush/15 px-2 py-2">
      {typeof rank === "number" ? (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-foreground">
          {rank}
        </span>
      ) : null}
      <ProductThumb image={product.image} name={product.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
        <p className="text-[11px] text-foreground/55">{detail}</p>
      </div>
      <p className="shrink-0 text-sm font-bold tabular-nums text-primary">
        {formatCurrency(product.revenue)}
      </p>
    </li>
  );
}

function SlowMovingListRow({ product }: { product: SlowMovingProductRow }) {
  return (
    <li className="flex items-center gap-2.5 rounded-lg border border-accent/10 bg-blush/15 px-2 py-2">
      <ProductThumb image={product.image} name={product.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
        <p className="text-[11px] text-foreground/55">
          {product.stock} in stock · {formatCurrency(product.price)}
        </p>
      </div>
    </li>
  );
}

async function fetchCatalogProducts(): Promise<ProductCatalogInput[]> {
  const res = await fetch("/api/admin/products", { cache: "no-store" });
  if (!res.ok) throw new Error("Unable to load products");

  const json = (await res.json()) as {
    products?: {
      id: string;
      name: string;
      images?: string[];
      status: string;
      price: number;
      total_stock: number;
    }[];
  };

  return (json.products ?? []).map((product) => ({
    id: product.id,
    name: product.name,
    images: Array.isArray(product.images) ? product.images : [],
    status: product.status,
    price: Number(product.price) || 0,
    totalStock: Number(product.total_stock) || 0
  }));
}

export function ProductIntelligenceClient() {
  const { dateFilter } = useAIGrowthContext();
  const { subscribeToOrderChanges } = useAdminNotifications();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [products, setProducts] = useState<ProductCatalogInput[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const orderData = await fetchAllOrdersWithItemsForAdmin();
      setOrders(orderData.map((order) => applyPaymentRulesToOrder(order)));
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    return subscribeToOrderChanges((payload) => {
      setOrders((prev) => patchProductOrders(prev, payload));
    });
  }, [subscribeToOrderChanges]);

  const loadProducts = useCallback(async () => {
    try {
      const rows = await fetchCatalogProducts();
      setProducts(rows);
      setProductsError(null);
    } catch {
      setProductsError("Unable to load products.");
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const intelligence = useMemo(
    () => computeProductIntelligence(orders, products, dateFilter),
    [orders, products, dateFilter]
  );

  const showMetrics =
    !ordersLoading &&
    !productsLoading &&
    !productsError &&
    intelligence.hasOrderLineItems &&
    intelligence.hasPeriodProductSales;

  return (
    <AIGrowthPageShell title="Product Intelligence">
      {ordersLoading || productsLoading ? (
        <p className="text-sm text-foreground/60">Loading product data…</p>
      ) : !showMetrics ? (
        <AIGrowthEmptyState icon={Package} />
      ) : (
        <div className="space-y-4">
          <AIGrowthSectionHeader
            title="Product Intelligence"
            subtitle="Product sales and revenue from order line items in the selected period"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard icon={Package} label="Active Products" value={String(intelligence.activeProducts)} />
            <KpiCard icon={ShoppingBag} label="Products Sold" value={String(intelligence.productsSold)} />
            <KpiCard
              icon={TrendingUp}
              label="Top Product Revenue"
              value={formatCurrency(intelligence.topProductRevenue)}
            />
            <KpiCard
              icon={CircleDollarSign}
              label="Average Revenue per Product"
              value={
                intelligence.averageRevenuePerProduct === null
                  ? "—"
                  : formatCurrency(intelligence.averageRevenuePerProduct)
              }
            />
          </div>

          {intelligence.productInsights.length > 0 ? (
            <PanelCard title="Product Insights" subtitle="Selected period">
              <ul className="space-y-2">
                {intelligence.productInsights.map((insight) => (
                  <AIGrowthInsightRow key={insight.id} tone={insight.tone} text={insight.text} />
                ))}
              </ul>
            </PanelCard>
          ) : null}

          {intelligence.topProducts.length > 0 ? (
            <PanelCard title="Top Products" subtitle="Top 10 by revenue in the selected period">
              <ul className="space-y-2">
                {intelligence.topProducts.map((product, index) => (
                  <ProductSalesListRow
                    key={product.productId}
                    product={product}
                    rank={index + 1}
                    detail={`${product.unitsSold} ${product.unitsSold === 1 ? "unit" : "units"} sold`}
                  />
                ))}
              </ul>
            </PanelCard>
          ) : null}

          {intelligence.revenueDistribution.length > 0 ? (
            <PanelCard title="Product Revenue Distribution" subtitle="Top products by revenue">
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart
                  data={intelligence.revenueDistribution}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0d8e4" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={56} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    width={48}
                    tickFormatter={(value) => formatCompactCurrency(Number(value))}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    {intelligence.revenueDistribution.map((entry, index) => (
                      <Cell key={entry.name} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </PanelCard>
          ) : null}

          {intelligence.slowMovingProducts.length > 0 ? (
            <PanelCard
              title="Slow Moving Products"
              subtitle="In stock with zero sales in the selected period"
            >
              <ul className="space-y-2">
                {intelligence.slowMovingProducts.map((product) => (
                  <SlowMovingListRow key={product.productId} product={product} />
                ))}
              </ul>
            </PanelCard>
          ) : null}

          {intelligence.bestSellers.length > 0 ? (
            <PanelCard title="Best Sellers" subtitle="Top products by units sold">
              <ul className="space-y-2">
                {intelligence.bestSellers.map((product, index) => (
                  <ProductSalesListRow
                    key={product.productId}
                    product={product}
                    rank={index + 1}
                    detail={`${product.unitsSold} ${product.unitsSold === 1 ? "unit" : "units"} sold`}
                  />
                ))}
              </ul>
            </PanelCard>
          ) : null}

          {intelligence.lifetimeTopProducts.length > 0 ? (
            <PanelCard title="Product Lifetime Value" subtitle="All-time top products by revenue">
              <ul className="space-y-2">
                {intelligence.lifetimeTopProducts.map((product, index) => (
                  <ProductSalesListRow
                    key={product.productId}
                    product={product}
                    rank={index + 1}
                    detail={`${product.unitsSold} total ${product.unitsSold === 1 ? "unit" : "units"} sold`}
                  />
                ))}
              </ul>
            </PanelCard>
          ) : null}
        </div>
      )}
    </AIGrowthPageShell>
  );
}
