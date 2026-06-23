import { getStageLabel } from "@/lib/orders/admin-order-ui";
import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import type { Order } from "@/types";

export function orderUpdatedAtMs(order: Pick<Order, "updated_at" | "created_at">): number {
  const raw = order.updated_at ?? order.created_at;
  if (!raw) return 0;
  const ms = new Date(raw).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

/**
 * True when `incoming` should replace `current`.
 * Tie on updated_at → keep current (prevents realtime flip-flop).
 */
export function isIncomingOrderNewer(incoming: Order, current: Order): boolean {
  const incomingMs = orderUpdatedAtMs(incoming);
  const currentMs = orderUpdatedAtMs(current);

  if (incomingMs === 0 && currentMs === 0) {
    return false;
  }
  if (incomingMs === 0) return false;
  if (currentMs === 0) return true;
  return incomingMs > currentMs;
}

/**
 * True when API row should replace the row currently shown.
 * Tie on updated_at → API wins (database source of truth on fetch).
 */
export function shouldApiOrderReplaceCurrent(apiOrder: Order, current: Order): boolean {
  const apiMs = orderUpdatedAtMs(apiOrder);
  const currentMs = orderUpdatedAtMs(current);

  if (apiMs === 0 && currentMs === 0) return true;
  if (apiMs === 0) return false;
  if (currentMs === 0) return true;
  if (apiMs > currentMs) return true;
  if (apiMs < currentMs) return false;
  return true;
}

export function logCustomerOrderRow(
  order: Order,
  context: "fetch" | "realtime" | "merge"
): void {
  const rawStatus = order.status as string;
  const normalizedStatus = normalizeLegacyStatus(rawStatus);
  const visible = getStageLabel(order);

  console.info("ACCOUNT ORDERS FETCH", {
    context,
    orderId: order.id,
    orderNumber: order.order_number,
    "raw database status": rawStatus,
    "normalized status": normalizedStatus,
    "visible status": visible,
    updated_at: order.updated_at ?? order.created_at
  });

  console.info("[account/orders]", {
    context,
    orderId: order.id,
    "raw status": rawStatus,
    "normalized status": normalizedStatus,
    updated_at: order.updated_at ?? order.created_at,
    visible
  });
}

export function logCustomerOrdersBatch(orders: Order[], context: "fetch" | "realtime" | "merge"): void {
  console.info("ACCOUNT ORDERS FETCH", { context, count: orders.length });
  for (const order of orders) {
    logCustomerOrderRow(order, context);
  }
}

export function sortCustomerOrders(orders: Order[]): Order[] {
  return [...orders].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Apply API fetch results without rolling back newer realtime/local state.
 * API wins per order only when its updated_at is >= the row already shown.
 */
export function reconcileCustomerOrdersFromFetch(prev: Order[], fetched: Order[]): Order[] {
  const prevById = new Map(prev.map((o) => [o.id, o]));
  const fetchedIds = new Set(fetched.map((o) => o.id));

  const reconciled = fetched.map((apiOrder) => {
    const current = prevById.get(apiOrder.id);
    if (!current) return apiOrder;
    if (shouldApiOrderReplaceCurrent(apiOrder, current)) {
      return apiOrder;
    }
    console.info("[account/orders] fetch kept newer local row", {
      orderId: apiOrder.id,
      apiStatus: apiOrder.status,
      apiUpdatedAt: apiOrder.updated_at,
      localStatus: current.status,
      localUpdatedAt: current.updated_at
    });
    return current;
  });

  for (const local of prev) {
    if (!fetchedIds.has(local.id)) {
      reconciled.push(local);
    }
  }

  return sortCustomerOrders(reconciled);
}

/**
 * Merge a realtime/bus order into the customer list.
 * Ignores events older than the row already shown (by updated_at).
 */
export function mergeCustomerOrderInList(
  prev: Order[],
  incoming: Order,
  event: "INSERT" | "UPDATE"
): Order[] {
  console.log("[Realtime]", incoming.id, incoming.status, incoming.updated_at);

  const idx = prev.findIndex((o) => o.id === incoming.id);

  if (idx >= 0) {
    const current = prev[idx];
    console.log("[Merge before]", current?.status, current?.updated_at);

    if (!isIncomingOrderNewer(incoming, current)) {
      console.info("[account/orders] ignoring stale realtime event", {
        orderId: incoming.id,
        incomingStatus: incoming.status,
        incomingUpdatedAt: incoming.updated_at,
        currentStatus: current.status,
        currentUpdatedAt: current.updated_at
      });
      console.log("[Merge after]", current.status, current.updated_at, "(unchanged)");
      return prev;
    }

    const nextOrder: Order = { ...current, ...incoming, status: incoming.status };
    const next = [...prev];
    next[idx] = nextOrder;
    console.log("[Merge after]", nextOrder.status, nextOrder.updated_at);
    logCustomerOrderRow(nextOrder, "merge");
    return next;
  }

  if (event === "INSERT" || event === "UPDATE") {
    console.log("[Merge before]", undefined, undefined);
    console.log("[Merge after]", incoming.status, incoming.updated_at);
    logCustomerOrderRow(incoming, "merge");
    return sortCustomerOrders([incoming, ...prev]);
  }

  return prev;
}
