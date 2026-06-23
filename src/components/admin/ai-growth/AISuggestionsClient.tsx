"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Lightbulb } from "lucide-react";
import { AIGrowthPageShell } from "@/components/admin/ai-growth/AIGrowthPageShell";
import {
  AIGrowthEmptyState,
  AIGrowthInsightRow,
  AIGrowthSectionHeader
} from "@/components/admin/ai-growth/ai-growth-shared";
import { useAIGrowthContext } from "@/components/admin/ai-growth/ai-growth-context";
import { useAdminNotifications } from "@/contexts/AdminNotificationsProvider";
import type { OrderRealtimeEvent } from "@/lib/admin/notifications/types";
import { PanelCard } from "@/components/admin/analytics/analytics-shared";
import {
  AI_SUGGESTION_GROUP_LABELS,
  computeAISuggestions,
  type AISuggestionPriority
} from "@/lib/ai-growth/ai-suggestions";
import { type ProductCatalogInput } from "@/lib/ai-growth/product-intelligence";
import { fetchAllOrdersWithItemsForAdmin } from "@/lib/admin/fetch-all-orders";
import { applyPaymentRulesToOrder } from "@/lib/orders/payment-rules";
import type { Order } from "@/types";

const GROUP_PRESENTATION: Record<
  AISuggestionPriority,
  { emoji: string; subtitle: string }
> = {
  critical: { emoji: "🚨", subtitle: "Requires immediate action" },
  warning: { emoji: "⚠️", subtitle: "Metrics worth monitoring" },
  healthy: { emoji: "✅", subtitle: "Store performance indicators" },
  information: { emoji: "ℹ️", subtitle: "Reference metrics" }
};

function patchSuggestionOrders(prev: Order[], { event, order }: OrderRealtimeEvent): Order[] {
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

export function AISuggestionsClient() {
  const { orders, dateFilter } = useAIGrowthContext();
  const { subscribeToOrderChanges } = useAdminNotifications();
  const [ordersWithItems, setOrdersWithItems] = useState<Order[]>([]);
  const [products, setProducts] = useState<ProductCatalogInput[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSupportingData = useCallback(async () => {
    try {
      const [orderData, catalog] = await Promise.all([
        fetchAllOrdersWithItemsForAdmin(),
        fetchCatalogProducts()
      ]);
      setOrdersWithItems(orderData.map((order) => applyPaymentRulesToOrder(order)));
      setProducts(catalog);
    } catch {
      setOrdersWithItems([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSupportingData();
  }, [loadSupportingData]);

  useEffect(() => {
    return subscribeToOrderChanges((payload) => {
      setOrdersWithItems((prev) => patchSuggestionOrders(prev, payload));
    });
  }, [subscribeToOrderChanges]);

  const suggestionGroups = useMemo(
    () => computeAISuggestions(orders, ordersWithItems, products, dateFilter),
    [orders, ordersWithItems, products, dateFilter]
  );

  const hasBaseOrders = orders.length > 0;
  const hasSuggestions = suggestionGroups.length > 0;

  return (
    <AIGrowthPageShell title="AI Suggestions">
      {loading ? (
        <p className="text-sm text-foreground/60">Loading suggestion data…</p>
      ) : !hasBaseOrders || !hasSuggestions ? (
        <AIGrowthEmptyState icon={Lightbulb} />
      ) : (
        <div className="space-y-4">
          <AIGrowthSectionHeader
            title="AI Suggestions"
            subtitle="Rule-based insights from existing order data"
          />

          {suggestionGroups.map((group) => {
            const presentation = GROUP_PRESENTATION[group.priority];
            const itemCount = group.suggestions.length;

            return (
              <PanelCard
                key={group.priority}
                title={`${presentation.emoji} ${AI_SUGGESTION_GROUP_LABELS[group.priority]}`}
                subtitle={presentation.subtitle}
                action={
                  <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-primary">
                    {itemCount}
                  </span>
                }
                className="min-h-0"
              >
                <ul className="space-y-2">
                  {group.suggestions.map((suggestion) => (
                    <AIGrowthInsightRow
                      key={suggestion.id}
                      tone={suggestion.tone ?? group.tone}
                      text={suggestion.text}
                      detail={suggestion.detail}
                    />
                  ))}
                </ul>
              </PanelCard>
            );
          })}
        </div>
      )}
    </AIGrowthPageShell>
  );
}
