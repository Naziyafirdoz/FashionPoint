import { filterOrdersByStoreRange } from "@/lib/admin/store-analytics";
import { customerName } from "@/lib/orders/admin-orders";
import type { AIGrowthDateFilter } from "@/components/admin/ai-growth/ai-growth-shared";
import type { Order, OrderStatus } from "@/types";

const REVENUE_EXCLUDED: Set<OrderStatus> = new Set(["cancelled", "returned"]);

export type CustomerAggregate = {
  key: string;
  name: string;
  orderCount: number;
  revenue: number;
  firstOrderAt: string;
};

export type CustomerInsight = {
  id: string;
  tone: "success" | "warning" | "info";
  text: string;
};

export type CustomerIntelligenceSnapshot = {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  repeatPurchaseRate: number | null;
  topCustomers: CustomerAggregate[];
  newVsReturning: { label: string; count: number; fill: string }[];
  lifetimeValueTop10: CustomerAggregate[];
  repeatCustomers: CustomerAggregate[];
  customerInsights: CustomerInsight[];
};

export function getCustomerKey(order: Order): string {
  if (order.user_id) return `user:${order.user_id}`;

  const email = (order.guest_email ?? order.shipping_address?.email ?? "").trim().toLowerCase();
  if (email) return `email:${email}`;

  const phone = order.shipping_address?.phone?.trim();
  if (phone) return `phone:${phone}`;

  return `order:${order.id}`;
}

function getFilterCutoff(filter: AIGrowthDateFilter): Date {
  const now = new Date();

  switch (filter) {
    case "today": {
      const cutoff = new Date(now);
      cutoff.setHours(0, 0, 0, 0);
      return cutoff;
    }
    case "7d": {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 7);
      cutoff.setHours(0, 0, 0, 0);
      return cutoff;
    }
    case "30d": {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 30);
      cutoff.setHours(0, 0, 0, 0);
      return cutoff;
    }
    case "90d": {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 90);
      cutoff.setHours(0, 0, 0, 0);
      return cutoff;
    }
    case "year":
      return new Date(now.getFullYear(), 0, 1);
    default:
      return new Date(0);
  }
}

function orderRevenue(order: Order): number {
  if (REVENUE_EXCLUDED.has(order.status)) return 0;
  return Number(order.total) || 0;
}

function preferCustomerName(current: string, next: string): string {
  if (current === "Guest" || current.includes("@")) {
    if (next !== "Guest" && !next.includes("@")) return next;
  }
  return current;
}

function buildCustomerAggregates(orders: Order[]): Map<string, CustomerAggregate> {
  const map = new Map<string, CustomerAggregate>();

  for (const order of orders) {
    const key = getCustomerKey(order);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        key,
        name: customerName(order),
        orderCount: 1,
        revenue: orderRevenue(order),
        firstOrderAt: order.created_at
      });
      continue;
    }

    existing.orderCount += 1;
    existing.revenue += orderRevenue(order);
    existing.name = preferCustomerName(existing.name, customerName(order));
    if (order.created_at < existing.firstOrderAt) {
      existing.firstOrderAt = order.created_at;
    }
  }

  return map;
}

function sortByRevenueDesc(customers: CustomerAggregate[]): CustomerAggregate[] {
  return [...customers].sort((a, b) => {
    if (b.revenue !== a.revenue) return b.revenue - a.revenue;
    return b.orderCount - a.orderCount;
  });
}

function formatCurrencyForInsight(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function buildCustomerInsights(input: {
  repeatPurchaseRate: number | null;
  topCustomer: CustomerAggregate | null;
  totalCustomers: number;
  periodRevenue: number;
}): CustomerInsight[] {
  const insights: CustomerInsight[] = [];

  if (input.repeatPurchaseRate !== null) {
    insights.push({
      id: "repeat-purchase-rate",
      tone: "info",
      text: `Repeat purchase rate: ${input.repeatPurchaseRate}%.`
    });
  }

  if (input.topCustomer && input.topCustomer.revenue > 0) {
    insights.push({
      id: "top-customer",
      tone: "info",
      text: `Top customer ${input.topCustomer.name} generated ${formatCurrencyForInsight(input.topCustomer.revenue)} across ${input.topCustomer.orderCount} ${input.topCustomer.orderCount === 1 ? "order" : "orders"}.`
    });
  }

  if (input.totalCustomers > 0 && input.periodRevenue > 0) {
    const averageRevenuePerCustomer = input.periodRevenue / input.totalCustomers;
    insights.push({
      id: "average-revenue-per-customer",
      tone: "info",
      text: `Average revenue per customer ${formatCurrencyForInsight(averageRevenuePerCustomer)}.`
    });
  }

  return insights;
}

export function computeCustomerIntelligence(
  orders: Order[],
  filter: AIGrowthDateFilter
): CustomerIntelligenceSnapshot {
  const periodOrders = filterOrdersByStoreRange(orders, filter);
  const lifetimeAggregates = buildCustomerAggregates(orders);
  const periodAggregates = buildCustomerAggregates(periodOrders);
  const periodCustomers = sortByRevenueDesc([...periodAggregates.values()]);
  const cutoff = getFilterCutoff(filter);

  let newCustomers = 0;
  let returningCustomers = 0;

  for (const customer of periodCustomers) {
    const lifetime = lifetimeAggregates.get(customer.key);
    const firstOrderAt = lifetime?.firstOrderAt ?? customer.firstOrderAt;
    if (new Date(firstOrderAt) >= cutoff) {
      newCustomers += 1;
    } else {
      returningCustomers += 1;
    }
  }

  const repeatInPeriod = periodCustomers.filter((customer) => customer.orderCount > 1).length;
  const repeatPurchaseRate =
    periodCustomers.length > 0
      ? Math.round((repeatInPeriod / periodCustomers.length) * 100)
      : null;

  const lifetimeCustomers = sortByRevenueDesc([...lifetimeAggregates.values()]);
  const repeatCustomers = lifetimeCustomers.filter((customer) => customer.orderCount > 1);
  const periodRevenue = periodCustomers.reduce((sum, customer) => sum + customer.revenue, 0);
  const customerInsights = buildCustomerInsights({
    repeatPurchaseRate,
    topCustomer: periodCustomers[0] ?? null,
    totalCustomers: periodCustomers.length,
    periodRevenue
  });

  return {
    totalCustomers: periodCustomers.length,
    newCustomers,
    returningCustomers,
    repeatPurchaseRate,
    topCustomers: periodCustomers,
    newVsReturning: [
      { label: "New Customers", count: newCustomers, fill: "#10b981" },
      { label: "Returning Customers", count: returningCustomers, fill: "#7b0d2b" }
    ],
    lifetimeValueTop10: lifetimeCustomers.slice(0, 10),
    repeatCustomers,
    customerInsights
  };
}
