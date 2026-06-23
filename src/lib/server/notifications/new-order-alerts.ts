import type { SupabaseClient } from "@supabase/supabase-js";

import { getAdminEmail, getStaffOrderAlertEmails, getWorkerEmails } from "@/lib/admin/admin-contacts";

import { sendOrderReceived } from "@/lib/server/email";

import {
  CUSTOMER_ORDER_PLACED_EVENT,
  CUSTOMER_ORDER_SHIPPED_EVENT,
  logCustomerEmailDelivery,
  wasCustomerEmailSent,
  wasCustomerShippedEmailSent
} from "@/lib/server/notifications/customer-email-dedup";
import { dispatchOrderNotification } from "@/lib/server/notifications/notification-service";

import { RESEND_FROM_ORDERS } from "@/lib/server/resend-from-addresses";
import { createServiceClient } from "@/lib/supabase";

import type { Order } from "@/types";

/** Send admin alerts for a newly placed order (in-app + email + WhatsApp + push). */
export async function sendNewOrderAlerts(
  db: SupabaseClient,
  order: Order,
  options?: { force?: boolean }
): Promise<void> {
  try {
    console.info("[new-order] starting admin alert dispatch", {
      orderId: order.id,
      orderNumber: order.order_number,
      path: "sendNewOrderAlerts → dispatchOrderNotification → sendEmailChannel"
    });
    console.info("[new-order] note: email alerts use dispatchOrderNotification (not notifyAdminNewOrder)");

    await dispatchOrderNotification(db, order, "new_order", {
      force: options?.force,
      skipChannels: ["whatsapp", "push"]
    });

    console.info("[new-order] admin alert dispatch finished", {
      orderId: order.id,
      orderNumber: order.order_number,
      recipients: getStaffOrderAlertEmails(),
      adminEmail: getAdminEmail(),
      workerEmails: getWorkerEmails()
    });
  } catch (error) {
    console.error("[new-order] admin alert dispatch failed", {
      orderId: order.id,
      orderNumber: order.order_number,
      adminEmail: process.env.ADMIN_EMAIL ?? "(not set)",
      workerEmails: process.env.WORKER_EMAILS ?? "(not set)",
      error
    });
  }
}

/** Customer acknowledgement when an order is placed (before admin approval). */
export async function notifyCustomerOrderReceived(order: Order): Promise<void> {
  const email = order.shipping_address?.email ?? order.guest_email;
  if (!email) return;

  const db = createServiceClient();
  if (db && (await wasCustomerEmailSent(db, order.id, CUSTOMER_ORDER_PLACED_EVENT))) {
    console.info("[new-order] customer order placed email skipped — already sent", {
      orderId: order.id
    });
    return;
  }

  console.info("[new-order] sending customer order received", {
    orderId: order.id,
    orderNumber: order.order_number,
    to: email
  });

  await sendOrderReceived({ to: email, order });

  console.info("[new-order] customer order received sent", {
    orderId: order.id,
    orderNumber: order.order_number
  });
}

export async function resendNewOrderReminder(
  db: SupabaseClient,
  order: Order
): Promise<void> {
  await dispatchOrderNotification(db, order, "new_order", { force: true });
}

export async function notifyAdminWorkerPacked(db: SupabaseClient, order: Order): Promise<void> {
  await dispatchOrderNotification(db, order, "packed");
}

export async function notifyAdminReadyForDispatch(db: SupabaseClient, order: Order): Promise<void> {
  await dispatchOrderNotification(db, order, "ready_for_shipping");
}

export async function notifyAdminOrderShipped(db: SupabaseClient, order: Order): Promise<void> {
  await dispatchOrderNotification(db, order, "shipped");
}

export async function notifyAdminPackingAssigned(db: SupabaseClient, order: Order): Promise<void> {
  await dispatchOrderNotification(db, order, "packing_assigned");
}

export async function notifyCustomerOrderShipped(
  order: Order,
  message: string
): Promise<void> {
  const email = order.shipping_address?.email ?? order.guest_email;
  if (!email) return;

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const db = createServiceClient();
  if (db && (await wasCustomerShippedEmailSent(db, order.id))) {
    console.info("[shipped] customer shipped email skipped — already sent", {
      orderId: order.id
    });
    return;
  }

  const { buildCustomerOrderShippedEmail } = await import("@/lib/server/notifications/email-templates");

  const { Resend } = await import("resend");

  const resend = new Resend(resendKey);

  const template = buildCustomerOrderShippedEmail(order);

  void message;

  try {
    await resend.emails.send({
      from: RESEND_FROM_ORDERS,
      to: email,
      subject: template.subject,
      html: template.html
    });

    if (db) {
      await logCustomerEmailDelivery(db, {
        orderId: order.id,
        event: CUSTOMER_ORDER_SHIPPED_EVENT,
        success: true
      });
    }
  } catch (err) {
    if (db) {
      await logCustomerEmailDelivery(db, {
        orderId: order.id,
        event: CUSTOMER_ORDER_SHIPPED_EVENT,
        success: false,
        errorMessage: err instanceof Error ? err.message : "Email send failed"
      });
    }
    throw err;
  }
}
