import type { SupabaseClient } from "@supabase/supabase-js";
import { getDeliveryDueAt } from "@/lib/orders/getDeliveryDueAt";
import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import type { Order } from "@/types";

const DELIVERY_DUE_EVENT = "delivery_due";

const TERMINAL_STATUSES = new Set([
  "delivered",
  "cancelled",
  "cancel_requested",
  "cancellation_approved",
  "returned"
]);

export type DeliveryDueNotification = {
  type: typeof DELIVERY_DUE_EVENT;
  title: string;
  message: string;
};

export function buildDeliveryDueNotification(order: Order): DeliveryDueNotification {
  return {
    type: DELIVERY_DUE_EVENT,
    title: "Delivery Due Today",
    message: `Order ${order.order_number} should be delivered today.`
  };
}

export function isDeliveryDueReminderEligible(order: Order, now = new Date()): boolean {
  const status = normalizeLegacyStatus(order.status);
  if (TERMINAL_STATUSES.has(status)) {
    return false;
  }

  const dueAt = getDeliveryDueAt(order.created_at);
  return now >= dueAt;
}

async function wasDeliveryDueNotified(db: SupabaseClient, orderId: string): Promise<boolean> {
  const { data: logRow } = await db
    .from("notification_logs")
    .select("id")
    .eq("order_id", orderId)
    .eq("event", DELIVERY_DUE_EVENT)
    .eq("success", true)
    .maybeSingle();

  if (logRow) return true;

  const { data: inApp } = await db
    .from("notifications")
    .select("payload")
    .eq("order_id", orderId)
    .eq("recipient", "admin")
    .eq("type", "reminder")
    .maybeSingle();

  const payload = inApp?.payload as { event?: string; type?: string; fired?: boolean } | null;
  return payload?.event === DELIVERY_DUE_EVENT && payload?.fired === true;
}

async function fireDeliveryDueReminder(
  db: SupabaseClient,
  order: Order
): Promise<"fired" | "skipped"> {
  if (!(await isDeliveryDueReminderEligible(order))) {
    return "skipped";
  }

  if (await wasDeliveryDueNotified(db, order.id)) {
    return "skipped";
  }

  const notification = buildDeliveryDueNotification(order);

  const { error: upsertError } = await db.from("notifications").upsert(
    {
      order_id: order.id,
      type: "reminder",
      recipient: "admin",
      title: notification.title,
      message: notification.message,
      payload: {
        type: DELIVERY_DUE_EVENT,
        event: DELIVERY_DUE_EVENT,
        order_id: order.id,
        order_number: order.order_number,
        fired: true
      },
      status: "active",
      is_read: false,
      remind_after: null
    },
    { onConflict: "order_id,type,recipient" }
  );

  if (upsertError) {
    console.error("[delivery-due-reminders] notifications upsert failed", {
      orderId: order.id,
      message: upsertError.message
    });
    await db.from("notification_logs").insert({
      order_id: order.id,
      channel: "push",
      event: DELIVERY_DUE_EVENT,
      success: false,
      error_message: upsertError.message
    });
    return "skipped";
  }

  await db.from("notification_logs").insert({
    order_id: order.id,
    channel: "push",
    event: DELIVERY_DUE_EVENT,
    success: true
  });

  console.info("[delivery-due-reminders] fired", {
    orderId: order.id,
    orderNumber: order.order_number,
    type: notification.type,
    title: notification.title
  });

  return "fired";
}

/** Scan open orders and fire delivery-due admin reminders when due. */
export async function processDeliveryDueReminders(db: SupabaseClient): Promise<number> {
  const { data: orders, error } = await db
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[delivery-due-reminders] fetch orders failed", { message: error.message });
    return 0;
  }

  const now = new Date();
  const candidates = (orders ?? []).filter((row) => {
    const order = row as Order;
    return isDeliveryDueReminderEligible(order, now);
  });

  console.info("[delivery-due-reminders] processing", { candidates: candidates.length });

  let fired = 0;
  for (const row of candidates) {
    const result = await fireDeliveryDueReminder(db, row as Order);
    if (result === "fired") fired++;
  }

  console.info("[delivery-due-reminders] completed", { fired });
  return fired;
}
