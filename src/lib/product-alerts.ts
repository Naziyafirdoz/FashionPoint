import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/admin";
import { devLog } from "@/lib/dev-log";

export type ProductAlertInput = {
  email: string | null;
  phone: string | null;
  color: string;
  notificationTypes: Array<"email" | "whatsapp">;
};

type SaveResult =
  | { ok: true }
  | { ok: false; error: { message: string; code?: string; hint?: string; details?: string } };

function resolveClient(): { client: SupabaseClient; kind: "service" | "anon" } | null {
  const service = createServiceClient();
  if (service) return { client: service, kind: "service" };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !anon) return null;

  return {
    client: createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false }
    }),
    kind: "anon"
  };
}

export async function saveProductAlert(input: ProductAlertInput): Promise<SaveResult> {
  const resolved = resolveClient();
  if (!resolved) {
    return {
      ok: false,
      error: {
        message: "Database unavailable.",
        code: "NO_SUPABASE_CLIENT",
        hint: "Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
      }
    };
  }

  const payload = {
    email: input.email,
    phone: input.phone,
    color: input.color,
    notification_types: input.notificationTypes
  };

  devLog("Saving alert:", payload);

  const { error } = await resolved.client.from("product_alerts").insert(payload);

  if (error) {
    console.error("Supabase error:", error);
    return {
      ok: false,
      error: {
        message: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details
      }
    };
  }

  return { ok: true };
}
