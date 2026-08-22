import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { ensureCustomerRecord } from "@/lib/auth/helpers";
import { requireRequestUser } from "@/lib/auth/request-user";
import { createAdminClient } from "@/lib/supabase/admin";

type ProfileResponse = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  preferred_size: string | null;
  bust_measurement: number | null;
  waist_measurement: number | null;
  shoulder_measurement: number | null;
};

function asNullableText(value: unknown): string | null {
  return String(value ?? "").trim() || null;
}

function asNullableMeasurement(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  return Number(value);
}

function toProfile(user: User, row: Record<string, unknown> | null): ProfileResponse {
  return {
    id: user.id,
    email: user.email ?? "",
    full_name: typeof row?.full_name === "string" ? row.full_name : row?.full_name == null ? null : String(row.full_name),
    phone: typeof row?.phone === "string" ? row.phone : row?.phone == null ? null : String(row.phone),
    preferred_size:
      typeof row?.preferred_size === "string"
        ? row.preferred_size
        : row?.preferred_size == null
          ? null
          : String(row.preferred_size),
    bust_measurement: row?.bust_measurement == null ? null : Number(row.bust_measurement),
    waist_measurement: row?.waist_measurement == null ? null : Number(row.waist_measurement),
    shoulder_measurement: row?.shoulder_measurement == null ? null : Number(row.shoulder_measurement)
  };
}

async function loadProfileRow(userId: string) {
  const db = createAdminClient();
  if (!db) return { db: null, row: null as Record<string, unknown> | null };

  const { data } = await db.from("customers").select("*").eq("id", userId).maybeSingle();
  return { db, row: (data as Record<string, unknown> | null) ?? null };
}

async function ensureOwnCustomer(user: User) {
  const created = await ensureCustomerRecord({
    userId: user.id,
    email: user.email ?? ""
  });
  if (!created.ok) {
    return { ok: false as const, response: NextResponse.json({ error: created.error }, { status: 500 }) };
  }

  const loaded = await loadProfileRow(user.id);
  if (!loaded.db) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Database not configured" }, { status: 500 })
    };
  }
  if (!loaded.row) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Profile not found" }, { status: 404 })
    };
  }

  return { ok: true as const, db: loaded.db, row: loaded.row };
}

export async function GET(req: Request) {
  const auth = await requireRequestUser(req);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const ready = await ensureOwnCustomer(user);
  if (!ready.ok) return ready.response;

  return NextResponse.json({ profile: toProfile(user, ready.row) });
}

export async function PATCH(req: Request) {
  const auth = await requireRequestUser(req);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const ready = await ensureOwnCustomer(user);
  if (!ready.ok) return ready.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const payload: Record<string, string | number | null> = {};

  if ("full_name" in body) payload.full_name = asNullableText(body.full_name);
  if ("phone" in body) payload.phone = asNullableText(body.phone);
  if ("preferred_size" in body) payload.preferred_size = asNullableText(body.preferred_size);

  if ("bust_measurement" in body) {
    const value = asNullableMeasurement(body.bust_measurement);
    if (value !== null && Number.isNaN(value)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    payload.bust_measurement = value;
  }
  if ("waist_measurement" in body) {
    const value = asNullableMeasurement(body.waist_measurement);
    if (value !== null && Number.isNaN(value)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    payload.waist_measurement = value;
  }
  if ("shoulder_measurement" in body) {
    const value = asNullableMeasurement(body.shoulder_measurement);
    if (value !== null && Number.isNaN(value)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    payload.shoulder_measurement = value;
  }

  if (Object.keys(payload).length > 0) {
    const { error } = await ready.db.from("customers").update(payload).eq("id", user.id);
    if (error) {
      return NextResponse.json({ error: "Unable to update profile" }, { status: 500 });
    }
  }

  const refreshed = await loadProfileRow(user.id);
  if (!refreshed.row) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ profile: toProfile(user, refreshed.row) });
}
