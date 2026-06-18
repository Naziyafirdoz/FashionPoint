import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

type AuthContext = {
  userId: string;
  db: SupabaseClient;
};

export async function requireCustomer():
  Promise<{ ok: true; ctx: AuthContext } | { ok: false; response: NextResponse }> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const db = createAdminClient();
  if (!db) {
    return { ok: false, response: NextResponse.json({ error: "DB not configured" }, { status: 503 }) };
  }

  return { ok: true, ctx: { userId: user.id, db } };
}
