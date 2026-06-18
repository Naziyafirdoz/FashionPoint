import { NextResponse } from "next/server";
import { requireWorkerStaff } from "@/lib/admin/require-staff";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import type { Order } from "@/types";

export async function GET() {
  const auth = await requireWorkerStaff();
  if (!auth.ok) return auth.response;

  let query = auth.ctx.db
    .from("orders")
    .select("*")
    .in("status", ["packing_assigned", "packed", "confirmed"])
    .order("created_at", { ascending: false });

  if (auth.ctx.role === "worker") {
    query = query.eq("assigned_worker_id", auth.ctx.userId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Unable to load orders" }, { status: 500 });
  }

  const orders: Order[] = [];
  for (const row of data ?? []) {
    orders.push(await normalizeOrderRecord(auth.ctx.db, row as Order, { persist: false }));
  }

  return NextResponse.json({ orders });
}
