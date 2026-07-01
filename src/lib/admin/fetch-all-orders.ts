import type { Order } from "@/types";

/** Admin list projection — includes `items` jsonb for qty/thumbnails (same source as customer My Orders). */
export const ADMIN_ORDER_LIST_SELECT =
  "id,order_number,status,payment_status,payment_method,total,created_at,updated_at,user_id,guest_email,shipping_address,items";

/** @deprecated Alias for ADMIN_ORDER_LIST_SELECT — items are always included for admin list UI. */
export const ADMIN_ORDER_LIST_WITH_ITEMS_SELECT = ADMIN_ORDER_LIST_SELECT;

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
