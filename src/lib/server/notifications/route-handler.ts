import { NextResponse } from "next/server";
import { requireAdminStaff } from "@/lib/admin/require-staff";
import { createServiceClient } from "@/lib/supabase";
import type { OrderNotificationEvent } from "@/lib/notifications/types";
import { dispatchOrderNotification } from "@/lib/server/notifications/notification-service";
import type { Order } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

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

export async function handleOrderNotificationRequest(
  req: Request,
  event: OrderNotificationEvent
) {
  const resolved = await resolveDb(req);
  if (!resolved.ok) return resolved.response;

  const body = await req.json().catch(() => ({}));
  const orderId = typeof body.order_id === "string" ? body.order_id.trim() : "";
  if (!orderId) {
    return NextResponse.json({ error: "order_id is required" }, { status: 400 });
  }

  const { data: order, error } = await resolved.db
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  await dispatchOrderNotification(resolved.db, order as Order, event, {
    force: body.force === true
  });

  return NextResponse.json({ success: true });
}
