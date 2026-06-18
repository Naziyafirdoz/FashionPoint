import type { SupabaseClient } from "@supabase/supabase-js";
import { sendOrderReceived } from "@/lib/server/email";
import { dispatchOrderNotification } from "@/lib/server/notifications/notification-service";
import { RESEND_FROM_ORDERS } from "@/lib/server/resend-from-addresses";
import type { Order } from "@/types";

/** Send admin alerts for a newly placed order (in-app + email + WhatsApp + push). */
export async function sendNewOrderAlerts(
  db: SupabaseClient,
  order: Order,
  options?: { force?: boolean }
): Promise<void> {
  console.info("[new-order] sending admin alert", {
    orderId: order.id,
    orderNumber: order.order_number
  });
  await dispatchOrderNotification(db, order, "new_order", { force: options?.force });
  console.info("[new-order] admin alert sent", {
    orderId: order.id,
    orderNumber: order.order_number
  });
}

/** Customer acknowledgement when an order is placed (before admin approval). */
export async function notifyCustomerOrderReceived(order: Order): Promise<void> {
  const email = order.shipping_address?.email ?? order.guest_email;
  if (!email) return;

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
  const { Resend } = await import("resend");
  const resend = new Resend(resendKey);
  await resend.emails.send({
    from: RESEND_FROM_ORDERS,
    to: email,
    subject: `Order Shipped — ${order.order_number}`,
    html: `<p>${message.replace(/\n/g, "<br/>")}</p>`
  });
}
