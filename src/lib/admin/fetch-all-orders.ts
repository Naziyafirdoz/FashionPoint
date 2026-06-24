import type { Order } from "@/types";

/** Lean projection for admin list/analytics pagination — excludes items and large JSON blobs. */
export const ADMIN_ORDER_LIST_SELECT =
  "id,order_number,status,payment_status,payment_method,total,created_at,updated_at,user_id,guest_email,shipping_address";

/**
 * Same admin list columns plus `items` (jsonb line items).
 * Required for product-level analytics via normalizeOrderItems().
 * ADMIN_ORDER_LIST_SELECT alone leaves order.items undefined on initial fetch.
 */
export const ADMIN_ORDER_LIST_WITH_ITEMS_SELECT =
  "id,order_number,status,payment_status,payment_method,total,created_at,updated_at,user_id,guest_email,shipping_address,items";

/** Minimal order columns for inventory units-sold aggregation (avoids heavy list projection + timeout). */
export const INVENTORY_REPORT_ORDER_SELECT = "id,status,created_at,items";

export async function fetchAllOrdersForAdmin(): Promise<Order[]> {
  const limit = 100;
  let page = 1;
  let all: Order[] = [];
  let total = Infinity;

  while (all.length < total) {
    const res = await fetch(`/api/orders?tab=all&limit=${limit}&page=${page}`, {
      cache: "no-store"
    });
    if (!res.ok) break;
    const data = await res.json();
    const batch = (data.orders ?? []) as Order[];
    all = all.concat(batch);
    total = typeof data.total === "number" ? data.total : batch.length;
    if (batch.length < limit) break;
    page += 1;
  }

  return all;
}

/** Paginated admin orders including line items — for product-level growth analytics. */
export async function fetchAllOrdersWithItemsForAdmin(): Promise<Order[]> {
  const limit = 100;
  let page = 1;
  let all: Order[] = [];
  let total = Infinity;

  while (all.length < total) {
    const res = await fetch(
      `/api/orders?tab=all&limit=${limit}&page=${page}&with_items=true`,
      { cache: "no-store" }
    );
    if (!res.ok) break;
    const data = await res.json();
    const batch = (data.orders ?? []) as Order[];
    all = all.concat(batch);
    total = typeof data.total === "number" ? data.total : batch.length;
    if (batch.length < limit) break;
    page += 1;
  }

  return all;
}
