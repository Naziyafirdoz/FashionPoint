import { Resend } from "resend";
import { getAdminEmail } from "@/lib/admin/admin-contacts";
import {
  buildCustomerOrderConfirmedEmail,
  buildCustomerOrderConfirmedEmailSimple,
  buildCustomerOrderReceivedEmail
} from "@/lib/server/notifications/email-templates";
import {
  CUSTOMER_ORDER_CONFIRMED_EVENT,
  CUSTOMER_ORDER_PLACED_EVENT,
  logCustomerEmailDelivery,
  wasCustomerEmailSent
} from "@/lib/server/notifications/customer-email-dedup";
import { createServiceClient } from "@/lib/supabase";
import { RESEND_FROM_ALERTS_STORE, RESEND_FROM_ORDERS } from "@/lib/server/resend-from-addresses";
import type { Order } from "@/types";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendOrderReceived(params: { to: string; order: Order }) {
  if (!resend) return;

  const db = createServiceClient();
  if (db && (await wasCustomerEmailSent(db, params.order.id, CUSTOMER_ORDER_PLACED_EVENT))) {
    return;
  }

  const { subject, html } = buildCustomerOrderReceivedEmail(params.order);

  try {
    await resend.emails.send({
      from: RESEND_FROM_ORDERS,
      to: params.to,
      subject,
      html
    });

    if (db) {
      await logCustomerEmailDelivery(db, {
        orderId: params.order.id,
        event: CUSTOMER_ORDER_PLACED_EVENT,
        success: true
      });
    }
  } catch (err) {
    if (db) {
      await logCustomerEmailDelivery(db, {
        orderId: params.order.id,
        event: CUSTOMER_ORDER_PLACED_EVENT,
        success: false,
        errorMessage: err instanceof Error ? err.message : "Email send failed"
      });
    }
    throw err;
  }
}

export async function sendOrderConfirmation(params: {
  to: string;
  orderNumber: string;
  total: number;
  order?: Order;
}) {
  if (!resend) return;

  const orderId = params.order?.id;
  const db = createServiceClient();

  if (orderId && db && (await wasCustomerEmailSent(db, orderId, CUSTOMER_ORDER_CONFIRMED_EVENT))) {
    return;
  }

  const template = params.order
    ? buildCustomerOrderConfirmedEmail(params.order)
    : buildCustomerOrderConfirmedEmailSimple({
        orderNumber: params.orderNumber,
        total: params.total
      });

  try {
    await resend.emails.send({
      from: RESEND_FROM_ORDERS,
      to: params.to,
      subject: template.subject,
      html: template.html
    });

    if (orderId && db) {
      await logCustomerEmailDelivery(db, {
        orderId,
        event: CUSTOMER_ORDER_CONFIRMED_EVENT,
        success: true
      });
    }
  } catch (err) {
    if (orderId && db) {
      await logCustomerEmailDelivery(db, {
        orderId,
        event: CUSTOMER_ORDER_CONFIRMED_EVENT,
        success: false,
        errorMessage: err instanceof Error ? err.message : "Email send failed"
      });
    }
    throw err;
  }
}

export async function sendLowStockAlert(productName: string) {
  const admin = getAdminEmail();
  if (!resend || !admin) return;
  await resend.emails.send({
    from: RESEND_FROM_ALERTS_STORE,
    to: admin,
    subject: `Low Stock Alert — ${productName}`,
    html: `<p>Product <strong>${productName}</strong> is out of stock.</p>`
  });
}
