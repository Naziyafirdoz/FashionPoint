import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type AdminContext = { db: SupabaseClient; userId: string };

export async function requireAdmin(): Promise<
  { ok: true; ctx: AdminContext } | { ok: false; response: NextResponse }
> {
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

  const { data: adminUser } = await db
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .single();

  if (!adminUser) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true, ctx: { db, userId: user.id } };
}
