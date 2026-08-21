import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import { isAdminUser } from "@/lib/auth/helpers";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import {
  cancelDeliveryFollowUpReminders,
  snoozeDeliveryFollowUpReminder,
  startDeliveryFollowUpSchedule
} from "@/lib/server/notifications/delivery-follow-up-reminders";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await isAdminUser(user.id);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = createServiceClient();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";

  const { id } = await params;
  const { data: existing, error: fetchError } = await db
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: "Unable to load order" }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const order = await normalizeOrderRecord(db, existing as Order, { persist: false });

  switch (action) {
    case "start":
      await startDeliveryFollowUpSchedule(db, order);
      return NextResponse.json({
        success: true,
        message: "Delivery follow-up is disabled; leftover reminders cancelled"
      });
    case "snooze":
      await snoozeDeliveryFollowUpReminder(db, order);
      return NextResponse.json({
        success: true,
        message: "Delivery follow-up is disabled; leftover reminders cancelled"
      });
    case "cancel":
      await cancelDeliveryFollowUpReminders(db, id);
      return NextResponse.json({ success: true, message: "Delivery follow-up stopped" });
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}
