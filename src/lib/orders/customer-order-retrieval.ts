import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Order } from "@/types";

/** Columns used by My Orders UI — `total` is the real DB column (not total_amount). */
export const CUSTOMER_ORDER_LIST_SELECT =
  "id,order_number,created_at,status,payment_status,payment_method,total,items,user_id,guest_email,shipping_address,updated_at,delivery_confirmed_at,tracking_id,tracking_number,shipment_id,delivery_status,courier_name,courier_partner,delivery_partner,fulfillment_method,fulfillment_zone,branch_id,shipping_date";

const CUSTOMER_ORDER_QUERY_LIMIT = 20;

type OrderQueryDebugMeta = {
  source: string;
  columns: string;
  count: "exact" | "estimated" | "none";
  page?: number;
  limit?: number;
  offset?: number;
  filters: Record<string, unknown>;
  nestedJoins: boolean;
};

function createDebugTimerLabel(): string {
  return `orders-${Date.now()}-${Math.random()}`;
}

function logOrderQueryStart(meta: OrderQueryDebugMeta): string {
  const timerLabel = createDebugTimerLabel();
  console.info("[orders-debug] query start", meta);
  console.time(timerLabel);
  return timerLabel;
}

function logOrderQueryEnd(
  timerLabel: string,
  meta: OrderQueryDebugMeta,
  extra?: Record<string, unknown>
) {
  console.timeEnd(timerLabel);
  console.info("[orders-debug] query end", { ...meta, ...extra });
}

type FetchCustomerOrdersOptions = {
  limit?: number;
};

function applyOptionalLimit(orders: Order[], limit?: number): Order[] {
  const cap = limit ?? CUSTOMER_ORDER_QUERY_LIMIT;
  if (cap < 1) return orders;
  return orders.slice(0, cap);
}

/**
 * @deprecated Replaced by sequential queries in fetchCustomerOrdersForUser.
 * Kept only so existing imports do not break; do not use in new SQL filters.
 */
export function buildCustomerOrdersOrFilter(userId: string, email?: string | null): string {
  return `user_id.eq.${userId}`;
}

async function fetchCustomerOrdersForUserImpl(
  db: SupabaseClient,
  userId: string,
  email?: string | null,
  options?: FetchCustomerOrdersOptions
): Promise<{ orders: Order[]; error: string | null }> {
  console.log("CUSTOMER ORDERS FETCH");
  console.info("[customer-orders] fetch start", { userId, email: email ?? null });
  const normalizedEmail = email?.trim().toLowerCase() ?? null;
  const rowLimit = options?.limit ?? CUSTOMER_ORDER_QUERY_LIMIT;

  const query1Meta: OrderQueryDebugMeta = {
    source: "customer-orders-query1-user_id",
    columns: CUSTOMER_ORDER_LIST_SELECT,
    count: "none",
    limit: rowLimit,
    filters: { userId },
    nestedJoins: false
  };
  const query1Timer = logOrderQueryStart(query1Meta);
  const query1Started = performance.now();

  try {
    const { data: userOrders, error } = await db
      .from("orders")
      .select(CUSTOMER_ORDER_LIST_SELECT)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(rowLimit);

    console.log("[customer-orders] query1 elapsed", performance.now() - query1Started);

    logOrderQueryEnd(query1Timer, query1Meta, {
      rows: userOrders?.length ?? 0,
      errorCode: error?.code ?? null,
      errorMessage: error?.message ?? null
    });

    if (error) {
      console.error("[customer-orders]", error);
    } else {
      console.log("[customer-orders] query1 rows", userOrders?.length || 0);
      if (userOrders && userOrders.length > 0) {
        const orders = applyOptionalLimit(userOrders as Order[], options?.limit);
        console.info("[customer-orders] fetch success", {
          userId,
          email: email ?? null,
          count: orders.length,
          source: "query1-user_id"
        });
        return { orders, error: null };
      }
    }
  } catch (error) {
    console.timeEnd(query1Timer);
    console.error("[customer-orders]", error);
  }

  if (!normalizedEmail) {
    return { orders: [], error: null };
  }

  const query2Meta: OrderQueryDebugMeta = {
    source: "customer-orders-query2-guest_email",
    columns: CUSTOMER_ORDER_LIST_SELECT,
    count: "none",
    limit: rowLimit,
    filters: { email: normalizedEmail },
    nestedJoins: false
  };
  const query2Timer = logOrderQueryStart(query2Meta);

  try {
    const { data: guestOrders, error } = await db
      .from("orders")
      .select(CUSTOMER_ORDER_LIST_SELECT)
      .ilike("guest_email", normalizedEmail)
      .order("created_at", { ascending: false })
      .limit(rowLimit);

    logOrderQueryEnd(query2Timer, query2Meta, {
      rows: guestOrders?.length ?? 0,
      errorCode: error?.code ?? null,
      errorMessage: error?.message ?? null
    });

    if (error) {
      console.error("[customer-orders]", error);
    } else {
      console.log("[customer-orders] query2 rows", guestOrders?.length || 0);
      if (guestOrders && guestOrders.length > 0) {
        const orders = applyOptionalLimit(guestOrders as Order[], options?.limit);
        console.info("[customer-orders] fetch success", {
          userId,
          email: normalizedEmail,
          count: orders.length,
          source: "query2-guest_email"
        });
        return { orders, error: null };
      }
    }
  } catch (error) {
    console.timeEnd(query2Timer);
    console.error("[customer-orders]", error);
  }

  const query3Meta: OrderQueryDebugMeta = {
    source: "customer-orders-query3-legacy-shipping-email",
    columns: CUSTOMER_ORDER_LIST_SELECT,
    count: "none",
    limit: rowLimit,
    filters: { email: normalizedEmail },
    nestedJoins: false
  };
  const query3Timer = logOrderQueryStart(query3Meta);

  try {
    const { data: recentOrders, error } = await db
      .from("orders")
      .select(CUSTOMER_ORDER_LIST_SELECT)
      .order("created_at", { ascending: false })
      .limit(rowLimit);

    const legacyOrders =
      (recentOrders as Order[] | null)?.filter((order) => {
        const shippingEmail = order.shipping_address?.email?.trim().toLowerCase();
        return shippingEmail === normalizedEmail;
      }) ?? [];

    logOrderQueryEnd(query3Timer, query3Meta, {
      rows: legacyOrders.length,
      scanned: recentOrders?.length ?? 0,
      errorCode: error?.code ?? null,
      errorMessage: error?.message ?? null
    });

    if (error) {
      console.error("[customer-orders]", error);
      return { orders: [], error: null };
    }

    console.log("[customer-orders] query3 rows", legacyOrders.length);
    const orders = applyOptionalLimit(legacyOrders, options?.limit);
    console.info("[customer-orders] fetch success", {
      userId,
      email: normalizedEmail,
      count: orders.length,
      source: "query3-legacy-shipping-email"
    });
    return { orders, error: null };
  } catch (error) {
    console.timeEnd(query3Timer);
    console.error("[customer-orders]", error);
    return { orders: [], error: null };
  }
}

/** Dedupes identical SSR fetches within the same React render pass. */
export const fetchCustomerOrdersForUser = cache(fetchCustomerOrdersForUserImpl);
