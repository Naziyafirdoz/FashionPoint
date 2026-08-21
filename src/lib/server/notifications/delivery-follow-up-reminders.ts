import type { SupabaseClient } from "@supabase/supabase-js";
import { customerName, customerPhone } from "@/lib/orders/admin-orders";
import type { Order } from "@/types";

export const DELIVERY_FOLLOW_UP_EVENT = "delivery_follow_up";

export function buildDeliveryFollowUpMessage(order: Order): string {
  return [
    `Order ID: ${order.order_number}`,
    `Customer: ${customerName(order)}`,
    `Phone: ${customerPhone(order)}`,
    `Current Status: Shipped`,
    "",
    "Has this order been handed over to the customer?"
  ].join("\n");
}

export async function cancelDeliveryFollowUpReminders(
  db: SupabaseClient,
  orderId: string
): Promise<void> {
  await db
    .from("notifications")
    .update({ status: "cancelled", remind_after: null, is_read: true })
    .eq("order_id", orderId)
    .eq("type", "reminder")
    .eq("recipient", "admin")
    .filter("payload->>event", "eq", DELIVERY_FOLLOW_UP_EVENT);
}

/**
 * Legacy admin delivery-confirmation reminders are disabled.
 * Mark Shipped is the final Fashion Point action; courier handles delivery.
 * Remaining start/snooze calls cancel leftovers instead of scheduling a nag.
 */
export async function startDeliveryFollowUpSchedule(
  db: SupabaseClient,
  order: Order
): Promise<void> {
  await cancelDeliveryFollowUpReminders(db, order.id);
}

export async function snoozeDeliveryFollowUpReminder(
  db: SupabaseClient,
  order: Order
): Promise<void> {
  await cancelDeliveryFollowUpReminders(db, order.id);
}

/** Cancel leftover delivery follow-up reminders instead of firing them. */
export async function processDeliveryFollowUpReminders(db: SupabaseClient): Promise<number> {
  const { data: rows, error } = await db
    .from("notifications")
    .select("order_id")
    .eq("type", "reminder")
    .eq("recipient", "admin")
    .eq("status", "active")
    .filter("payload->>event", "eq", DELIVERY_FOLLOW_UP_EVENT)
    .limit(200);

  if (error) {
    console.error("[delivery-follow-up] fetch active failed", { message: error.message });
    return 0;
  }

  const orderIds = [...new Set((rows ?? []).map((row) => row.order_id).filter(Boolean))];
  for (const orderId of orderIds) {
    await cancelDeliveryFollowUpReminders(db, orderId);
  }

  console.info("[delivery-follow-up] cancelled leftovers", { cancelled: orderIds.length });
  return orderIds.length;
}
