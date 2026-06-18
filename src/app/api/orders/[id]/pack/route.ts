import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import { assertTransition } from "@/lib/orders/workflow-validation";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

const isDev = process.env.NODE_ENV === "development";

function isPackedAtSchemaError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    msg.includes("packed_at") ||
    (msg.includes("schema cache") && msg.includes("packed"))
  );
}

async function buildPackUpdatePayload(
  db: SupabaseClient,
  now: string
): Promise<Record<string, unknown>> {
  const payload: Record<string, unknown> = {
    status: "ready_to_ship",
    updated_at: now
  };

  const { error: probeError } = await db.from("orders").select("packed_at").limit(0);
  if (!probeError) {
    payload.packed_at = now;
  }

  return payload;
}

export async function POST(_req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const { data: existing, error: fetchError } = await auth.ctx.db
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

  const rawStatus = existing.status as string;
  const status =
    rawStatus === "cod_verification"
      ? "processing"
      : rawStatus === "shipped"
        ? "out_for_delivery"
        : existing.status;

  const transitionError = assertTransition(status, "ready_to_ship");
  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 400 });
  }

  const now = new Date().toISOString();
  let updatePayload = await buildPackUpdatePayload(auth.ctx.db, now);

  let { data: updated, error } = await auth.ctx.db
    .from("orders")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error && isPackedAtSchemaError(error)) {
    if (isDev) {
      console.warn("[pack-order] retry without packed_at", { orderId: id, error });
    }
    updatePayload = { status: "ready_to_ship", updated_at: now };
    const retry = await auth.ctx.db
      .from("orders")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    updated = retry.data;
    error = retry.error;
  }

  if (error) {
    if (isDev) {
      console.error("[pack-order] supabaseError", { orderId: id, updatePayload, error });
    }
    return NextResponse.json(
      { error: isDev ? error.message : "Unable to pack order" },
      { status: 500 }
    );
  }

  if (!updated) {
    return NextResponse.json({ error: "Order not found after update" }, { status: 404 });
  }

  const normalized = await normalizeOrderRecord(auth.ctx.db, updated as Order, { persist: false });

  return NextResponse.json({ success: true, order: normalized, message: "Order packed — ready to ship" });
}
