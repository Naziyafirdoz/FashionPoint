import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

export type StaffRole = "admin" | "worker";

export type StaffContext = {
  db: SupabaseClient;
  userId: string;
  role: StaffRole;
};

export async function requireStaff(
  allowedRoles: StaffRole[] = ["admin", "worker"]
): Promise<{ ok: true; ctx: StaffContext } | { ok: false; response: NextResponse }> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const db = createServiceClient();
  if (!db) {
    return { ok: false, response: NextResponse.json({ error: "DB not configured" }, { status: 503 }) };
  }

  const { data: staff } = await db
    .from("admin_users")
    .select("user_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!staff) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const role = ((staff.role as string) ?? "admin").toLowerCase() as StaffRole;
  if (!allowedRoles.includes(role)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true, ctx: { db, userId: user.id, role } };
}

export async function requireAdminStaff(): Promise<
  { ok: true; ctx: StaffContext } | { ok: false; response: NextResponse }
> {
  return requireStaff(["admin"]);
}

export async function requireWorkerStaff(): Promise<
  { ok: true; ctx: StaffContext } | { ok: false; response: NextResponse }
> {
  return requireStaff(["worker", "admin"]);
}
