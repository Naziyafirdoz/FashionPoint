import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveNotificationRecipientEmails } from "@/lib/admin/notification-recipient-resolver";
import { isAwaitingOrderApproval } from "@/lib/orders/fulfillment-workflow";
import { buildPendingOrderReminderEmail } from "@/lib/server/notifications/email-templates";
import {
  cancelOrderReminders,
  scheduleOrderReminder
} from "@/lib/server/notifications/order-reminders";
import { createOrderEmailActionUrls } from "@/lib/server/order-actions/tokens";
import { getResendFromAlerts } from "@/lib/server/resend-from-addresses";
import {
  formatReminderDelayLabel,
  getReminderDelayMinutes
} from "@/lib/server/notifications/reminder-config";
import type { Order } from "@/types";

/** Schedule admin approval reminder in order_reminders + notifications. */
export async function scheduleAdminApprovalReminder(
  db: SupabaseClient,
  order: Order
): Promise<{ ok: true; remindAt: string } | { ok: false; error: string }> {
  const delayMinutes = getReminderDelayMinutes();
  const scheduled = await scheduleOrderReminder(db, {
    orderId: order.id,
    audience: "admin",
    delayMinutes
  });

  if (!scheduled.ok) {
    console.error("[admin-approval-reminder] order_reminders insert failed", {
      orderId: order.id,
      error: scheduled
    });
    return scheduled;
  }

  console.info("[admin-approval-reminder] order_reminders row created", {
    orderId: order.id,
    remindAt: scheduled.remindAt,
    delayMinutes
  });

  const { data: notificationRow, error } = await db
    .from("notifications")
    .upsert(
      {
        order_id: order.id,
        type: "reminder",
        recipient: "admin",
        title: "🔔 Pending Order Reminder",
        message: `${order.order_number} is still awaiting approval.`,
        payload: {
          event: "pending_order_reminder",
          order_id: order.id,
          order_number: order.order_number
        },
        status: "active",
        is_read: false,
        remind_after: scheduled.remindAt
      },
      { onConflict: "order_id,type,recipient" }
    )
    .select("id, type, status, remind_after")
    .maybeSingle();

  if (error) {
    console.error("[admin-approval-reminder] notifications upsert failed", {
      orderId: order.id,
      error: error.message,
      code: error.code
    });
    return { ok: false, error: "Unable to save reminder notification" };
  }

  console.info("[admin-approval-reminder] notifications row upserted", {
    orderId: order.id,
    notificationId: notificationRow?.id,
    type: notificationRow?.type,
    status: notificationRow?.status,
    remind_after: notificationRow?.remind_after
  });

  return scheduled;
}

/** Cancel scheduled admin approval reminders when order is approved. */
export async function cancelAdminApprovalReminders(
  db: SupabaseClient,
  orderId: string
): Promise<void> {
  await cancelOrderReminders(db, orderId, "admin");
  await db
    .from("notifications")
    .update({ status: "cancelled", remind_after: null })
    .eq("order_id", orderId)
    .eq("type", "reminder")
    .eq("recipient", "admin")
    .eq("status", "active");
}

/** Email-only reminder after 2 hours (no WhatsApp / push). */
export async function sendAdminPendingOrderReminderEmail(
  db: SupabaseClient,
  order: Order
): Promise<void> {
  const recipients = await resolveNotificationRecipientEmails("new_order", db);
  const eventKey = "pending_order_reminder";

  if (!recipients.length) {
    await db.from("notification_logs").insert({
      order_id: order.id,
      channel: "email",
      event: eventKey,
      success: false,
      error_message: "No notification recipients configured"
    });
    return;
  }

  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    const actionUrls = await createOrderEmailActionUrls(db, order.id);
    if (!actionUrls) throw new Error("Unable to create secure email action tokens");

    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);
    const template = await buildPendingOrderReminderEmail(order, actionUrls);

    await resend.emails.send({
      from: await getResendFromAlerts(),
      to: recipients,
      subject: template.subject,
      html: template.html
    });

    await db.from("notification_logs").insert({
      order_id: order.id,
      channel: "email",
      event: eventKey,
      success: true
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    await db.from("notification_logs").insert({
      order_id: order.id,
      channel: "email",
      event: eventKey,
      success: false,
      error_message: message
    });
  }
}

/** Fire in-app reminder + admin email when order is still awaiting approval. */
export async function fireAdminPendingOrderReminder(
  db: SupabaseClient,
  order: Order
): Promise<void> {
  const firedMessage = `This order has been awaiting approval for more than ${formatReminderDelayLabel()}.`;

  await db.from("notifications").upsert(
    {
      order_id: order.id,
      type: "reminder",
      recipient: "admin",
      title: "🔔 Pending Order Reminder",
      message: firedMessage,
      payload: {
        event: "pending_order_reminder",
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

  await sendAdminPendingOrderReminderEmail(db, order);
}

export async function processAdminDueReminder(
  db: SupabaseClient,
  order: Order
): Promise<"skipped" | "fired"> {
  if (!isAwaitingOrderApproval(order.status as string)) {
    return "skipped";
  }
  await fireAdminPendingOrderReminder(db, order);
  return "fired";
}
