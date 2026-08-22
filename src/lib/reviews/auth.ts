import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRequestUser } from "@/lib/auth/request-user";
import type { SupabaseClient } from "@supabase/supabase-js";

type AuthContext = {
  userId: string;
  db: SupabaseClient;
};

export async function requireCustomer(
  request: Request
): Promise<{ ok: true; ctx: AuthContext } | { ok: false; response: NextResponse }> {
  const auth = await requireRequestUser(request);
  if (!auth.ok) return auth;

  const db = createAdminClient();
  if (!db) {
    return { ok: false, response: NextResponse.json({ error: "DB not configured" }, { status: 503 }) };
  }

  return { ok: true, ctx: { userId: auth.user.id, db } };
}
