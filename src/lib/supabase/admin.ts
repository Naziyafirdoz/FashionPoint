import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export function createServiceClient() {
  return createAdminClient();
}

export const isSupabaseConfigured = Boolean(
  url && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
