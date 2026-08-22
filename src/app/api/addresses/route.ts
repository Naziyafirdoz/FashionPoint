import { NextResponse } from "next/server";
import { ensureCustomerRecord } from "@/lib/auth/helpers";
import { requireRequestUser } from "@/lib/auth/request-user";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Address } from "@/types";

const MAX_ADDRESSES = 5;

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

export async function GET(req: Request) {
  const auth = await requireRequestUser(req);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const db = createAdminClient();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const { data, error } = await db
    .from("addresses")
    .select("*")
    .eq("customer_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Unable to load addresses" }, { status: 500 });
  }

  const addresses = (data ?? []) as Address[];
  return NextResponse.json({
    addresses,
    canAddMore: addresses.length < MAX_ADDRESSES
  });
}

export async function POST(req: Request) {
  const auth = await requireRequestUser(req);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const db = createAdminClient();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const customer = await ensureCustomerRecord({
    userId: user.id,
    email: user.email ?? ""
  });
  if (!customer.ok) {
    return NextResponse.json({ error: customer.error }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const line1 = typeof body.line1 === "string" ? body.line1.trim() : "";
  const line2 = typeof body.line2 === "string" ? body.line2.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const state = typeof body.state === "string" ? body.state.trim() : "";
  const pincode = typeof body.pincode === "string" ? body.pincode.trim() : "";
  const label = typeof body.label === "string" ? body.label.trim() : "";
  const requestedDefault = body.is_default === true;

  const validationError = requiredAddressFields({ name, phone, line1, city, state, pincode });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const { count, error: countError } = await db
    .from("addresses")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", user.id);

  if (countError) {
    return NextResponse.json({ error: "Unable to save address" }, { status: 500 });
  }

  if ((count ?? 0) >= MAX_ADDRESSES) {
    return NextResponse.json({ error: `You can save up to ${MAX_ADDRESSES} addresses.` }, { status: 400 });
  }

  const isFirstAddress = (count ?? 0) === 0;
  const isDefault = requestedDefault || isFirstAddress;

  if (isDefault) {
    await db.from("addresses").update({ is_default: false }).eq("customer_id", user.id);
  }

  const { data, error } = await db
    .from("addresses")
    .insert({
      customer_id: user.id,
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
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Unable to save address" }, { status: 500 });
  }

  return NextResponse.json({ address: data as Address }, { status: 201 });
}
