import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth/request-user";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Address } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

function requiredAddressFields(input: {
  name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
}): string | null {
  if (!input.name || !input.phone || !input.line1 || !input.city || !input.state || !input.pincode) {
    return "Please fill in all required fields.";
  }
  return null;
}

function readString(value: unknown, fallback: string): string {
  if (value === undefined) return fallback;
  return typeof value === "string" ? value.trim() : fallback;
}

async function loadOwnedAddress(addressId: string, customerId: string) {
  const db = createAdminClient();
  if (!db) return { db: null, address: null as Address | null };

  const { data } = await db
    .from("addresses")
    .select("*")
    .eq("id", addressId)
    .eq("customer_id", customerId)
    .maybeSingle();

  return { db, address: (data as Address | null) ?? null };
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const auth = await requireRequestUser(req);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const { id } = await params;
  const addressId = id.trim();
  if (!addressId) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  const { db, address: existing } = await loadOwnedAddress(addressId, user.id);
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const name = readString(body.name, existing.name ?? "");
  const phone = readString(body.phone, existing.phone ?? "");
  const line1 = readString(body.line1, existing.line1 ?? "");
  const line2 = readString(body.line2, existing.line2 ?? "");
  const city = readString(body.city, existing.city ?? "");
  const state = readString(body.state, existing.state ?? "");
  const pincode = readString(body.pincode, existing.pincode ?? "");
  const label = readString(body.label, existing.label ?? "");
  const isDefault = typeof body.is_default === "boolean" ? body.is_default : existing.is_default;

  const validationError = requiredAddressFields({ name, phone, line1, city, state, pincode });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  if (isDefault) {
    await db.from("addresses").update({ is_default: false }).eq("customer_id", user.id);
  }

  const { data, error } = await db
    .from("addresses")
    .update({
      label: label || "Home",
      name,
      phone,
      line1,
      line2: line2 || null,
      city,
      state,
      pincode,
      is_default: isDefault
    })
    .eq("id", addressId)
    .eq("customer_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Unable to update address" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  return NextResponse.json({ address: data as Address });
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const auth = await requireRequestUser(req);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const { id } = await params;
  const addressId = id.trim();
  if (!addressId) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  const { db, address } = await loadOwnedAddress(addressId, user.id);
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }
  if (!address) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  const { error } = await db
    .from("addresses")
    .delete()
    .eq("id", addressId)
    .eq("customer_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Unable to delete address" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
