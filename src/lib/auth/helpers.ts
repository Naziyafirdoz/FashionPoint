import { createAdminClient } from "@/lib/supabase/admin";

export async function ensureCustomerRecord(params: {
  userId: string;
  email: string;
  fullName?: string;
  phone?: string;
}) {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Database not configured" };

  const { data: existing } = await admin
    .from("customers")
    .select("id")
    .eq("id", params.userId)
    .maybeSingle();

  if (existing) return { ok: true, created: false };

  const { error } = await admin.from("customers").insert({
    id: params.userId,
    email: params.email,
    full_name: params.fullName ?? null,
    phone: params.phone ?? null
  });

  if (error) {
    if (error.code === "23505") return { ok: true, created: false };
    return { ok: false, error: error.message };
  }
  return { ok: true, created: true };
}

export async function isAdminUser(userId: string) {
  const admin = createAdminClient();
  if (!admin) return false;

  const { data } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(data);
}

export function hasMeasurements(customer: {
  bust_measurement?: number | null;
  waist_measurement?: number | null;
  shoulder_measurement?: number | null;
} | null) {
  if (!customer) return false;
  return (
    customer.bust_measurement != null &&
    customer.waist_measurement != null &&
    customer.shoulder_measurement != null
  );
}
