import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdminStaff } from "@/lib/admin/require-staff";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import { sendDeliveredCustomerEmail } from "@/lib/server/notifications/delivered-customer-email";
import { createServiceClient } from "@/lib/supabase";
import type { Order } from "@/types";

async function resolveDb(req: Request): Promise<
  | { ok: true; db: SupabaseClient }
  | { ok: false; response: NextResponse }
> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    const db = createServiceClient();
    if (!db) {
      return {
        ok: false,
        response: NextResponse.json({ error: "DB not configured" }, { status: 503 })
      };
    }
    return { ok: true, db };
  }

  const auth = await requireAdminStaff();
  if (!auth.ok) return { ok: false, response: auth.response };
  return { ok: true, db: auth.ctx.db };
}

export async function processDeliveredNotification(
  db: SupabaseClient,
  orderId: string
): Promise<
  | { ok: true; result: "sent" | "skipped" | "failed" }
  | { ok: false; error: string }
> {
  const { data: order, error } = await db
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    return { ok: false, error: "Order not found" };
  }

  const normalized = await normalizeOrderRecord(db, order as Order, { persist: false });

  // Delivered customer email is only for Delivery Staff (delivery_boy).
  // Rapido/DTDC end at the shipping/dispatch email — do not send Delivered.
  if (normalized.fulfillment_method !== "delivery_boy") {
    console.info("[delivered-email] skipped — not delivery staff fulfillment", {
      orderId,
      fulfillment_method: normalized.fulfillment_method ?? null
    });
    return { ok: true, result: "skipped" };
  }

  const result = await sendDeliveredCustomerEmail(db, normalized);
  return { ok: true, result };
}

export async function handleDeliveredNotificationRequest(req: Request) {
  const resolved = await resolveDb(req);
  if (!resolved.ok) return resolved.response;

  const body = await req.json().catch(() => ({}));
  const orderId = typeof body.order_id === "string" ? body.order_id.trim() : "";
  if (!orderId) {
    return NextResponse.json({ error: "order_id is required" }, { status: 400 });
  }

  console.info("[delivered-email] sending", { orderId });

  const outcome = await processDeliveredNotification(resolved.db, orderId);
  if (!outcome.ok) {
    console.error("[delivered-email] failed", { orderId, error: outcome.error });
    return NextResponse.json({ error: outcome.error }, { status: 404 });
  }

  if (outcome.result === "failed") {
    console.error("[delivered-email] failed", { orderId, result: outcome.result });
    return NextResponse.json({ success: false, result: outcome.result }, { status: 500 });
  }

  console.info("[delivered-email] success", { orderId, result: outcome.result });
  return NextResponse.json({ success: true, result: outcome.result });
}
