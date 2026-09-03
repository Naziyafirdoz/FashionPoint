import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveNotificationRecipientEmails } from "@/lib/admin/notification-recipient-resolver";
import {
  inAppTypeFromEvent,
  type DbNotification,
  type NotificationChannel,
  type OrderNotificationEvent
} from "@/lib/notifications/types";
import {
  buildInAppMessage,
  buildOrderEmailTemplate,
  buildOrderWhatsAppText,
  buildPushPayload
} from "@/lib/server/notifications/email-templates";
import { createOrderEmailActionUrls } from "@/lib/server/order-actions/tokens";
import { sendPushToAdmins } from "@/lib/server/push";
import {
  resolveFcmPushEvent,
  sendOrderFcmPush
} from "@/lib/server/notifications/send-fcm-push";
import { getResendFromAlerts } from "@/lib/server/resend-from-addresses";
import { sendWhatsAppNotification } from "@/lib/server/whatsapp";
import { logWorkflow } from "@/lib/orders/workflow-logger";
import type { Order } from "@/types";

const DEDUP_EVENT_ALIASES: Record<string, string> = {
  worker_packed: "packed",
  ready_for_dispatch: "ready_for_shipping"
};

/** Admin email disabled for internal-only workflow events (in-app notifications still fire). */
const SKIP_ADMIN_EMAIL_EVENTS = new Set([
  "ready_for_shipping",
  "ready_for_dispatch",
  "shipped"
]);

function dedupEventKey(event: OrderNotificationEvent): string {
  return DEDUP_EVENT_ALIASES[event] ?? event;
}

export async function logNotificationDelivery(
  db: SupabaseClient,
  input: {
    orderId: string | null;
    channel: NotificationChannel;
    event: string;
    success: boolean;
    errorMessage?: string | null;
  }
): Promise<void> {
  await db.from("notification_logs").insert({
    order_id: input.orderId,
    channel: input.channel,
    event: dedupEventKey(input.event as OrderNotificationEvent),
    success: input.success,
    error_message: input.errorMessage?.trim() || null
  });
}

async function wasChannelSent(
  db: SupabaseClient,
  orderId: string,
  channel: NotificationChannel,
  event: string
): Promise<boolean> {
  const key = dedupEventKey(event as OrderNotificationEvent);
  const { data } = await db
    .from("order_notification_log")
    .select("id")
    .eq("order_id", orderId)
    .eq("channel", channel)
    .eq("event_type", key)
    .maybeSingle();
  return Boolean(data);
}

async function markChannelSent(
  db: SupabaseClient,
  orderId: string,
  channel: NotificationChannel,
  event: string
): Promise<void> {
  const key = dedupEventKey(event as OrderNotificationEvent);
  await db.from("order_notification_log").upsert(
    {
      order_id: orderId,
      channel,
      event_type: key,
      sent_at: new Date().toISOString()
    },
    { onConflict: "order_id,event_type,channel" }
  );
}

export async function createInAppNotification(
  db: SupabaseClient,
  order: Order,
  event: OrderNotificationEvent,
  recipient = "admin"
): Promise<DbNotification | null> {
  const type = inAppTypeFromEvent(event);
  const title =
    event === "new_order"
      ? "New Order"
      : type === "packed"
        ? "Packed"
        : type === "ready_for_shipping"
          ? "Ready For Shipping"
          : type === "shipped"
            ? "Shipped"
            : type === "packing_assigned"
              ? "Packing Assigned"
              : "Order Update";

  const { data, error } = await db
    .from("notifications")
    .upsert(
      {
        order_id: order.id,
        type,
        recipient,
        title,
        message: buildInAppMessage(order, event),
        payload: { order_number: order.order_number, event: dedupEventKey(event) },
        status: "active",
        is_read: false
      },
      { onConflict: "order_id,type,recipient" }
    )
    .select("*")
    .maybeSingle();

  if (error) {
    logWorkflow(
      "dashboard_notification_failed",
      {
        orderId: order.id,
        orderNumber: order.order_number,
        event: dedupEventKey(event),
        error: error.message
      },
      "error"
    );

    const { data: inserted, error: insertError } = await db
      .from("notifications")
      .insert({
        order_id: order.id,
        type,
        recipient,
        title,
        message: buildInAppMessage(order, event),
        payload: { order_number: order.order_number, event: dedupEventKey(event) },
        status: "active",
        is_read: false
      })
      .select("*")
      .maybeSingle();

    if (insertError) {
      logWorkflow(
        "dashboard_notification_failed",
        {
          orderId: order.id,
          orderNumber: order.order_number,
          event: dedupEventKey(event),
          error: insertError.message,
          phase: "insert_fallback"
        },
        "error"
      );
      return null;
    }

    if (inserted) {
      logWorkflow("dashboard_notification_created", {
        orderId: order.id,
        orderNumber: order.order_number,
        notificationId: inserted.id,
        type,
        event: dedupEventKey(event)
      });
    }

    return (inserted as DbNotification) ?? null;
  }

  if (data) {
    logWorkflow("dashboard_notification_created", {
      orderId: order.id,
      orderNumber: order.order_number,
      notificationId: data.id,
      type,
      event: dedupEventKey(event)
    });
  }

  return (data as DbNotification) ?? null;
}

async function sendEmailChannel(
  db: SupabaseClient,
  order: Order,
  event: OrderNotificationEvent,
  force: boolean
): Promise<void> {
  const eventKey = dedupEventKey(event);

  if (SKIP_ADMIN_EMAIL_EVENTS.has(eventKey)) {
    console.info("[admin-email] skipped — email disabled for internal workflow event", {
      orderId: order.id,
      event: eventKey
    });

    const fcmEvent = resolveFcmPushEvent(eventKey);
    if (fcmEvent) {
      await sendOrderFcmPush(order, fcmEvent);
    }

    return;
  }

  console.info("Starting admin email notification", {
    orderId: order.id,
    orderNumber: order.order_number,
    event: eventKey
  });

  const recipients = await resolveNotificationRecipientEmails("new_order", db);
  console.info("Recipients array", recipients);

  if (!recipients.length) {
    logWorkflow(
      "admin_email_failed",
      {
        orderId: order.id,
        orderNumber: order.order_number,
        event: eventKey,
        reason: "no_recipients_configured",
        adminEmailEnv: process.env.ADMIN_EMAIL ? "(set)" : "(not set)",
        workerEmailsEnv: process.env.WORKER_EMAILS ? "(set)" : "(not set)"
      },
      "error"
    );
    await logNotificationDelivery(db, {
      orderId: order.id,
      channel: "email",
      event: eventKey,
      success: false,
      errorMessage: "No notification recipients configured"
    });
    return;
  }

  if (!force && (await wasChannelSent(db, order.id, "email", eventKey))) {
    logWorkflow("admin_email_skipped", {
      orderId: order.id,
      orderNumber: order.order_number,
      event: eventKey,
      reason: "already_sent"
    });
    return;
  }

  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    let actionUrls =
      event === "new_order" ? await createOrderEmailActionUrls(db, order.id) : null;
    if (event === "new_order" && !actionUrls) {
      console.warn("[admin-email] token creation failed — sending alert without action buttons", {
        orderId: order.id,
        orderNumber: order.order_number
      });
    }

    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);
    const template = await buildOrderEmailTemplate(
      order,
      event,
      actionUrls ?? undefined
    );

    console.info("Sending new-order email", {
      orderId: order.id,
      orderNumber: order.order_number,
      event: eventKey,
      to: recipients,
      subject: template.subject
    });

    const response = await resend.emails.send({
      from: await getResendFromAlerts(),
      to: recipients,
      subject: template.subject,
      html: template.html
    });

    console.info("Resend response", response);

    if (response.error) {
      throw new Error(response.error.message ?? JSON.stringify(response.error));
    }

    await markChannelSent(db, order.id, "email", eventKey);
    await logNotificationDelivery(db, {
      orderId: order.id,
      channel: "email",
      event: eventKey,
      success: true
    });

    logWorkflow("admin_email_sent", {
      orderId: order.id,
      orderNumber: order.order_number,
      event: eventKey,
      recipientCount: recipients.length
    });

    const fcmEvent = resolveFcmPushEvent(eventKey);
    if (fcmEvent) {
      await sendOrderFcmPush(order, fcmEvent);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    logWorkflow(
      "admin_email_failed",
      {
        orderId: order.id,
        orderNumber: order.order_number,
        event: eventKey,
        error: message
      },
      "error"
    );
    await logNotificationDelivery(db, {
      orderId: order.id,
      channel: "email",
      event: eventKey,
      success: false,
      errorMessage: message
    });
  }
}

async function sendWhatsAppChannel(
  db: SupabaseClient,
  order: Order,
  event: OrderNotificationEvent,
  force: boolean
): Promise<void> {
  const eventKey = dedupEventKey(event);
  if (!force && (await wasChannelSent(db, order.id, "whatsapp", eventKey))) return;

  try {
    const text = await buildOrderWhatsAppText(order, event);
    const result = await sendWhatsAppNotification(text);
    if (!result.ok) {
      throw new Error(
        "reason" in result && result.reason ? String(result.reason) : "WhatsApp not configured"
      );
    }
    await markChannelSent(db, order.id, "whatsapp", eventKey);
    await logNotificationDelivery(db, {
      orderId: order.id,
      channel: "whatsapp",
      event: eventKey,
      success: true
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "WhatsApp send failed";
    await logNotificationDelivery(db, {
      orderId: order.id,
      channel: "whatsapp",
      event: eventKey,
      success: false,
      errorMessage: message
    });
  }
}

async function sendPushChannel(
  db: SupabaseClient,
  order: Order,
  event: OrderNotificationEvent,
  force: boolean
): Promise<void> {
  const eventKey = dedupEventKey(event);

  if (resolveFcmPushEvent(eventKey)) {
    return;
  }

  if (!force && (await wasChannelSent(db, order.id, "push", eventKey))) return;

  try {
    const push = buildPushPayload(order, event);
    const sent = await sendPushToAdmins(db, push);
    if (!sent) throw new Error("Push not configured or no subscriptions");
    await markChannelSent(db, order.id, "push", eventKey);
    await logNotificationDelivery(db, {
      orderId: order.id,
      channel: "push",
      event: eventKey,
      success: true
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Push send failed";
    await logNotificationDelivery(db, {
      orderId: order.id,
      channel: "push",
      event: eventKey,
      success: false,
      errorMessage: message
    });
  }
}

/** Dispatch in-app + email + WhatsApp + push for an order event. */
export async function dispatchOrderNotification(
  db: SupabaseClient,
  order: Order,
  event: OrderNotificationEvent,
  options?: { force?: boolean; skipChannels?: NotificationChannel[] }
): Promise<void> {
  await createInAppNotification(db, order, event);

  const skip = new Set(options?.skipChannels ?? []);
  const force = options?.force ?? false;

  if (!skip.has("email")) await sendEmailChannel(db, order, event, force);
  if (!skip.has("whatsapp")) await sendWhatsAppChannel(db, order, event, force);
  if (!skip.has("push")) await sendPushChannel(db, order, event, force);
}
