import type { SupabaseClient } from "@supabase/supabase-js";

/** Customer lifecycle email events — logged in `notification_logs` (no schema changes). */
export const CUSTOMER_ORDER_PLACED_EVENT = "customer_order_placed";
export const CUSTOMER_ORDER_CONFIRMED_EVENT = "customer_order_confirmed";
export const CUSTOMER_ORDER_SHIPPED_EVENT = "customer_order_shipped";
export const CUSTOMER_ORDER_DELIVERED_EVENT = "delivery_confirmation_email";
export const CUSTOMER_REFUND_PROCESSED_EVENT = "customer_refund_processed";

const SHIPPED_DEDUP_EVENTS = [
  CUSTOMER_ORDER_SHIPPED_EVENT,
  "rapido_shipped_email"
] as const;

export async function wasCustomerEmailSent(
  db: SupabaseClient,
  orderId: string,
  event: string
): Promise<boolean> {
  const { data } = await db
    .from("notification_logs")
    .select("id")
    .eq("order_id", orderId)
    .eq("event", event)
    .eq("success", true)
    .maybeSingle();
  return Boolean(data);
}

export async function wasCustomerShippedEmailSent(
  db: SupabaseClient,
  orderId: string
): Promise<boolean> {
  for (const event of SHIPPED_DEDUP_EVENTS) {
    if (await wasCustomerEmailSent(db, orderId, event)) {
      return true;
    }
  }
  return false;
}

export async function logCustomerEmailDelivery(
  db: SupabaseClient,
  input: {
    orderId: string;
    event: string;
    success: boolean;
    errorMessage?: string | null;
  }
): Promise<void> {
  await db.from("notification_logs").insert({
    order_id: input.orderId,
    channel: "email",
    event: input.event,
    success: input.success,
    error_message: input.errorMessage?.trim() || null
  });
}
