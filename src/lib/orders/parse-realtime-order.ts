import type { Order } from "@/types";

/** Normalize a Supabase realtime row into a full Order shape. */
export function parseRealtimeOrderRow(row: Record<string, unknown>): Order {
  const order = { ...row } as Order;

  if (typeof order.updated_at !== "string" && row.updated_at != null) {
    order.updated_at = String(row.updated_at);
  }

  if (typeof order.created_at !== "string" && row.created_at != null) {
    order.created_at = String(row.created_at);
  }

  if (typeof order.items === "string") {
    try {
      order.items = JSON.parse(order.items) as Order["items"];
    } catch {
      order.items = [];
    }
  }

  if (typeof order.shipping_address === "string") {
    try {
      order.shipping_address = JSON.parse(order.shipping_address) as Order["shipping_address"];
    } catch {
      // keep raw string
    }
  }

  return order;
}
