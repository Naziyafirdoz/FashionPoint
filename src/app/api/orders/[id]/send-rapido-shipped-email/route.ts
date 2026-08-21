import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import { isAdminUser } from "@/lib/auth/helpers";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import { attachOrderFulfillmentZone } from "@/lib/orders/order-fulfillment-zone";
import { sendRapidoShippedCustomerEmail } from "@/lib/server/notifications/rapido-shipped-email";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteContext) {
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

  const order = await attachOrderFulfillmentZone(
    db,
    await normalizeOrderRecord(db, existing as Order, { persist: false })
  );
  const result = await sendRapidoShippedCustomerEmail(db, order);

  return NextResponse.json({
    success: result !== "failed",
    result,
    message:
      result === "sent"
        ? "Rapido shipped email sent"
        : result === "skipped"
          ? "Rapido shipped email already sent"
          : "Unable to send Rapido shipped email"
  });
}
