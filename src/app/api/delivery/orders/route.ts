import { NextResponse } from "next/server";
import { requireDeliveryStaff } from "@/lib/admin/require-staff";
import { isOwnerOrAdmin } from "@/lib/admin/staff";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import type { Order } from "@/types";

/**
 * Delivery staff list:
 * - Out for Delivery (active Mark Delivery)
 * - Recently Delivered (green Delivered state — same assignment)
 */
export async function GET() {
  const auth = await requireDeliveryStaff();
  if (!auth.ok) return auth.response;

  let query = auth.ctx.db
    .from("orders")
    .select("*")
    .in("status", ["out_for_delivery", "delivered"])
    .eq("fulfillment_method", "delivery_boy")
    .order("updated_at", { ascending: false })
    .limit(50);

  if (!isOwnerOrAdmin(auth.ctx.roles)) {
    query = query.eq("assigned_delivery_worker_id", auth.ctx.userId);
  }

  const { data, error } = await query;
  if (error) {
    if (
      error.message.toLowerCase().includes("assigned_delivery_worker_id") ||
      error.message.toLowerCase().includes("fulfillment_method")
    ) {
      return NextResponse.json({ orders: [] });
    }
    return NextResponse.json({ error: "Unable to load orders" }, { status: 500 });
  }

  const orders: Order[] = [];
  for (const row of data ?? []) {
    orders.push(await normalizeOrderRecord(auth.ctx.db, row as Order, { persist: false }));
  }

  return NextResponse.json({ orders });
}
