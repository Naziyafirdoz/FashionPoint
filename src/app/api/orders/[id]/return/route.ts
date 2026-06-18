import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import {
  canRequestReturn,
  returnRequestBlockedReason
} from "@/lib/orders/customer-orders";
import { isReturnTableError, isValidReturnReason, RETURN_MIGRATION_UNAVAILABLE } from "@/lib/orders/returns";
import type { Order, ReturnRequest } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { id: orderId } = await params;
  const body = await req.json().catch(() => ({}));

  const reason = body.reason;
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const image_url = typeof body.image_url === "string" ? body.image_url.trim() : "";

  if (!isValidReturnReason(reason)) {
    return NextResponse.json({ error: "Please select a valid return reason" }, { status: 400 });
  }

  const { data: orderRow, error: orderError } = await db
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    return NextResponse.json({ error: "Unable to load order" }, { status: 500 });
  }

  if (!orderRow) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const order = orderRow as Order;

  if (order.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: existingReturn, error: existingError } = await db
    .from("return_requests")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existingError) {
    if (isReturnTableError(existingError)) {
      return NextResponse.json({ success: false, message: RETURN_MIGRATION_UNAVAILABLE }, { status: 503 });
    }
    return NextResponse.json({ error: "Unable to verify return status" }, { status: 500 });
  }

  const blocked = returnRequestBlockedReason(order, existingReturn as ReturnRequest | null);
  if (blocked || !canRequestReturn(order, existingReturn as ReturnRequest | null)) {
    return NextResponse.json({ error: blocked ?? "Return cannot be requested" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: created, error: insertError } = await db
    .from("return_requests")
    .insert({
      order_id: orderId,
      user_id: user.id,
      reason,
      notes: notes || null,
      image_url: image_url || null,
      status: "return_requested",
      created_at: now,
      updated_at: now
    })
    .select("*")
    .maybeSingle();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "A return request already exists for this order" }, { status: 409 });
    }
    if (isReturnTableError(insertError)) {
      return NextResponse.json({ success: false, message: RETURN_MIGRATION_UNAVAILABLE }, { status: 503 });
    }
    return NextResponse.json({ error: "Unable to submit return request" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    return_request: created as ReturnRequest,
    message: "Your return request has been submitted. We will review it shortly."
  });
}
