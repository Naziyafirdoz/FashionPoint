import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { ensureCustomerRecord } from "@/lib/auth/helpers";
import { requireRequestUser } from "@/lib/auth/request-user";
import { createAdminClient } from "@/lib/supabase/admin";

const MEASUREMENT_FIELDS = [
  "bust_measurement",
  "underbust_measurement",
  "waist_measurement",
  "shoulder_measurement",
  "height_cm",
  "weight_kg"
] as const;

type MeasurementField = (typeof MEASUREMENT_FIELDS)[number];

type MeasurementsResponse = {
  bust_measurement: number | null;
  underbust_measurement: number | null;
  waist_measurement: number | null;
  shoulder_measurement: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  units: {
    body: "inch";
    height: "cm";
    weight: "kg";
  };
};

function asNumberOrNull(value: unknown): number | null {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/** Stored units: body inches, height cm, weight kg. Empty/invalid → null. */
function asStoredMeasurement(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const num = Number(value);
  if (Number.isNaN(num) || !Number.isFinite(num)) return null;
  return num;
}

function toMeasurements(row: Record<string, unknown> | null): MeasurementsResponse {
  return {
    bust_measurement: asNumberOrNull(row?.bust_measurement),
    underbust_measurement: asNumberOrNull(row?.underbust_measurement),
    waist_measurement: asNumberOrNull(row?.waist_measurement),
    shoulder_measurement: asNumberOrNull(row?.shoulder_measurement),
    height_cm: asNumberOrNull(row?.height_cm),
    weight_kg: asNumberOrNull(row?.weight_kg),
    units: {
      body: "inch",
      height: "cm",
      weight: "kg"
    }
  };
}

async function loadMeasurementRow(userId: string) {
  const db = createAdminClient();
  if (!db) return { db: null, row: null as Record<string, unknown> | null };

  const { data } = await db
    .from("customers")
    .select(
      "bust_measurement, underbust_measurement, waist_measurement, shoulder_measurement, height_cm, weight_kg"
    )
    .eq("id", userId)
    .maybeSingle();

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

  const loaded = await loadMeasurementRow(user.id);
  if (!loaded.db) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Database not configured" }, { status: 500 })
    };
  }
  if (!loaded.row) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Measurements not found" }, { status: 404 })
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

  return NextResponse.json({ measurements: toMeasurements(ready.row) });
}

export async function PATCH(req: Request) {
  const auth = await requireRequestUser(req);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const ready = await ensureOwnCustomer(user);
  if (!ready.ok) return ready.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const payload: Partial<Record<MeasurementField, number | null>> = {};

  for (const field of MEASUREMENT_FIELDS) {
    if (field in input) {
      payload[field] = asStoredMeasurement(input[field]);
    }
  }

  if (Object.keys(payload).length > 0) {
    const { error } = await ready.db.from("customers").update(payload).eq("id", user.id);
    if (error) {
      return NextResponse.json({ error: "Unable to update measurements" }, { status: 500 });
    }
  }

  const refreshed = await loadMeasurementRow(user.id);
  if (!refreshed.row) {
    return NextResponse.json({ error: "Measurements not found" }, { status: 404 });
  }

  return NextResponse.json({ measurements: toMeasurements(refreshed.row) });
}
