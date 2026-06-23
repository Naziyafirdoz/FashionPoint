import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import { isAdminUser } from "@/lib/auth/helpers";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import { assertTransition } from "@/lib/orders/workflow-validation";
import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  console.info("[start-packing route] user id", user?.id ?? "(none)", userError?.message ?? "");

  if (!user) {
    console.info("[start-packing route] error", "unauthorized — no session user");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await isAdminUser(user.id);
  console.info("[start-packing route] admin check result", admin);

  if (!admin) {
    console.info("[start-packing route] error", "forbidden — not in admin_users");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = createServiceClient();
  if (!db) {
    console.info("[start-packing route] error", "database not configured");
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { id } = await params;
  const { data: existing, error: fetchError } = await db
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error("[start-packing route] error", fetchError.message);
    return NextResponse.json({ error: "Unable to load order" }, { status: 500 });
  }
  if (!existing) {
    console.info("[start-packing route] error", "order not found", id);
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const status = existing.status as string;
  console.info("[start-packing route] current status", status);

  if (normalizeLegacyStatus(status) !== "confirmed") {
    console.info("[start-packing route] error", "status is not confirmed", status);
    return NextResponse.json(
      { error: "Only confirmed orders can start packing" },
      { status: 400 }
    );
  }

  const transitionError = assertTransition(status, "packing_assigned");
  if (transitionError) {
    console.info("[start-packing route] error", transitionError);
    return NextResponse.json({ error: transitionError }, { status: 400 });
  }

  console.info("[start-packing route] attempting transition confirmed -> packing_assigned");

  const now = new Date().toISOString();
  const { data: updated, error } = await db
    .from("orders")
    .update({
      status: "packing_assigned",
      updated_at: now
    })
    .eq("id", id)
    .eq("status", "confirmed")
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[start-packing route] update result error", error.message);
    return NextResponse.json({ error: "Unable to start packing" }, { status: 500 });
  }

  if (!updated) {
    console.error("[start-packing route] update result", "0 rows updated");
    const { data: current } = await db.from("orders").select("status").eq("id", id).maybeSingle();
    console.info("[start-packing route] current status after failed update", current?.status);
    return NextResponse.json(
      { error: "Packing could not be started — order status may have changed" },
      { status: 409 }
    );
  }

  console.info("[start-packing route] update result", {
    orderId: id,
    rowsUpdated: 1,
    status: "packing_assigned"
  });

  const normalized = await normalizeOrderRecord(db, updated as Order, { persist: false });
  console.info("[start-packing route] new status from Supabase", normalized.status);

  return NextResponse.json({
    success: true,
    order: normalized,
    message: "Packing started"
  });
}
