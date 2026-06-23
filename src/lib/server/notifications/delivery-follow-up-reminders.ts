import type { SupabaseClient } from "@supabase/supabase-js";
import { customerName, customerPhone } from "@/lib/orders/admin-orders";
import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import type { Order } from "@/types";

export const DELIVERY_FOLLOW_UP_EVENT = "delivery_follow_up";
const FOLLOW_UP_INTERVAL_MS = 2 * 60 * 60 * 1000;

const SHIPPED_STATUSES = new Set(["shipped", "out_for_delivery"]);

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

function nextRemindAt(from = Date.now()): string {
  return new Date(from + FOLLOW_UP_INTERVAL_MS).toISOString();
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

export async function startDeliveryFollowUpSchedule(
  db: SupabaseClient,
  order: Order
): Promise<void> {
  const status = normalizeLegacyStatus(order.status);
  if (!SHIPPED_STATUSES.has(status)) {
    return;
  }

  const remindAfter = nextRemindAt();

  const { error } = await db.from("notifications").upsert(
    {
      order_id: order.id,
      type: "reminder",
      recipient: "admin",
      title: "🔔 Delivery Follow-up",
      message: buildDeliveryFollowUpMessage(order),
      payload: {
        event: DELIVERY_FOLLOW_UP_EVENT,
        order_id: order.id,
        order_number: order.order_number,
        customer_name: customerName(order),
        customer_phone: customerPhone(order),
        scheduled: true
      },
      status: "active",
      is_read: true,
      remind_after: remindAfter
    },
    { onConflict: "order_id,type,recipient" }
  );

  if (error) {
    console.error("[delivery-follow-up] schedule start failed", {
      orderId: order.id,
      message: error.message
    });
  }
}

export async function snoozeDeliveryFollowUpReminder(
  db: SupabaseClient,
  order: Order
): Promise<void> {
  const remindAfter = nextRemindAt();

  const { error } = await db.from("notifications").upsert(
    {
      order_id: order.id,
      type: "reminder",
      recipient: "admin",
      title: "🔔 Delivery Follow-up",
      message: buildDeliveryFollowUpMessage(order),
      payload: {
        event: DELIVERY_FOLLOW_UP_EVENT,
        order_id: order.id,
        order_number: order.order_number,
        customer_name: customerName(order),
        customer_phone: customerPhone(order),
        snoozed: true
      },
      status: "active",
      is_read: true,
      remind_after: remindAfter
    },
    { onConflict: "order_id,type,recipient" }
  );

  if (error) {
    console.error("[delivery-follow-up] snooze failed", {
      orderId: order.id,
      message: error.message
    });
  }
}

async function fireDeliveryFollowUpNotification(
  db: SupabaseClient,
  order: Order
): Promise<void> {
  const { error } = await db.from("notifications").upsert(
    {
      order_id: order.id,
      type: "reminder",
      recipient: "admin",
      title: "🔔 Delivery Follow-up",
      message: buildDeliveryFollowUpMessage(order),
      payload: {
        event: DELIVERY_FOLLOW_UP_EVENT,
        order_id: order.id,
        order_number: order.order_number,
        customer_name: customerName(order),
        customer_phone: customerPhone(order),
        fired: true,
        last_fired_at: new Date().toISOString()
      },
      status: "active",
      is_read: false,
      remind_after: nextRemindAt()
    },
    { onConflict: "order_id,type,recipient" }
  );

  if (error) {
    console.error("[delivery-follow-up] fire failed", {
      orderId: order.id,
      message: error.message
    });
    return;
  }

  await db.from("notification_logs").insert({
    order_id: order.id,
    channel: "push",
    event: DELIVERY_FOLLOW_UP_EVENT,
    success: true
  });

  console.info("[delivery-follow-up] fired", {
    orderId: order.id,
    orderNumber: order.order_number
  });
}

/** Process due delivery follow-up reminders for shipped orders. */
export async function processDeliveryFollowUpReminders(db: SupabaseClient): Promise<number> {
  const now = new Date().toISOString();

  const { data: dueRows, error } = await db
    .from("notifications")
    .select("id, order_id, remind_after, payload")
    .eq("type", "reminder")
    .eq("recipient", "admin")
    .eq("status", "active")
    .filter("payload->>event", "eq", DELIVERY_FOLLOW_UP_EVENT)
    .not("remind_after", "is", null)
    .lte("remind_after", now)
    .limit(50);

  if (error) {
    console.error("[delivery-follow-up] fetch due failed", { message: error.message });
    return 0;
  }

  let fired = 0;
  for (const row of dueRows ?? []) {
    const { data: order } = await db
      .from("orders")
      .select("*")
      .eq("id", row.order_id)
      .maybeSingle();

    if (!order) {
      await cancelDeliveryFollowUpReminders(db, row.order_id);
      continue;
    }

    const status = normalizeLegacyStatus((order as Order).status);
    if (!SHIPPED_STATUSES.has(status)) {
      await cancelDeliveryFollowUpReminders(db, row.order_id);
      continue;
    }

    await fireDeliveryFollowUpNotification(db, order as Order);
    fired++;
  }

  console.info("[delivery-follow-up] completed", { fired });
  return fired;
}
