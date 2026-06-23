import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import { isAdminUser } from "@/lib/auth/helpers";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import {
  buildShippingAddressWithRapidoDetails,
  type RapidoDeliveryDetails
} from "@/lib/orders/rapido-delivery-metadata";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

function parseDetails(body: Record<string, unknown>): RapidoDeliveryDetails | null {
  const rider_name = typeof body.rider_name === "string" ? body.rider_name.trim() : "";
  const rider_phone = typeof body.rider_phone === "string" ? body.rider_phone.trim() : "";
  const vehicle_number =
    typeof body.vehicle_number === "string" ? body.vehicle_number.trim() : "";
  const pickup_time = typeof body.pickup_time === "string" ? body.pickup_time.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";

  if (!rider_name && !rider_phone && !vehicle_number && !pickup_time && !notes) {
    return null;
  }

  return { rider_name, rider_phone, vehicle_number, pickup_time, notes };
}

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
  const details = parseDetails(body as Record<string, unknown>);
  if (!details) {
    return NextResponse.json({ error: "Rapido delivery details are required" }, { status: 400 });
  }

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

  const shippingAddress = buildShippingAddressWithRapidoDetails(
    (existing as Order).shipping_address as Record<string, unknown> | undefined,
    details
  );

  const { data: updated, error } = await db
    .from("orders")
    .update({
      shipping_address: shippingAddress,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[rapido-delivery-details] save failed", { orderId: id, message: error.message });
    return NextResponse.json({ error: "Unable to save Rapido delivery details" }, { status: 500 });
  }

  const normalized = await normalizeOrderRecord(db, updated as Order, { persist: false });
  return NextResponse.json({ success: true, order: normalized });
}
