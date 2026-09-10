import { Resend } from "resend";
import { resolveNotificationRecipientEmails } from "@/lib/admin/notification-recipient-resolver";
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
import { getResendFromAlertsStore, getResendFromOrders } from "@/lib/server/resend-from-addresses";
import { logWorkflow } from "@/lib/orders/workflow-logger";
import type { Order } from "@/types";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendOrderReceived(params: { to: string; order: Order }) {
  if (!resend) {
    logWorkflow(
      "customer_email_failed",
      {
        orderId: params.order.id,
        orderNumber: params.order.order_number,
        event: "order_placed",
        reason: "RESEND_API_KEY not configured"
      },
      "error"
    );
    return;
  }

  const db = createServiceClient();
  if (db && (await wasCustomerEmailSent(db, params.order.id, CUSTOMER_ORDER_PLACED_EVENT))) {
    logWorkflow("customer_email_skipped", {
      orderId: params.order.id,
      orderNumber: params.order.order_number,
      event: "order_placed",
      reason: "already_sent"
    });
    return;
  }

  const { subject, html } = await buildCustomerOrderReceivedEmail(params.order);

  try {
    await resend.emails.send({
      from: await getResendFromOrders(),
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
  if (!resend) {
    logWorkflow(
      "customer_email_failed",
      {
        orderId: params.order?.id ?? null,
        orderNumber: params.orderNumber,
        event: "order_confirmed",
        reason: "RESEND_API_KEY not configured"
      },
      "error"
    );
    return;
  }

  const orderId = params.order?.id;
  const db = createServiceClient();

  if (orderId && db && (await wasCustomerEmailSent(db, orderId, CUSTOMER_ORDER_CONFIRMED_EVENT))) {
    return;
  }

  let template: { subject: string; html: string };
  try {
    if (params.order) {
      const { renderCustomerOrderEmailFromTemplate } = await import(
        "@/lib/server/notifications/email-template-system"
      );
      template = await renderCustomerOrderEmailFromTemplate(
        "order_confirmation",
        params.order,
        { db }
      );
    } else {
      template = await buildCustomerOrderConfirmedEmailSimple({
        orderNumber: params.orderNumber,
        total: params.total
      });
    }
  } catch (buildErr) {
    console.warn("[sendOrderConfirmation] template build failed — using simple fallback", {
      orderId: orderId ?? null,
      orderNumber: params.orderNumber,
      error: buildErr instanceof Error ? buildErr.message : String(buildErr)
    });
    try {
      template = params.order
        ? await buildCustomerOrderConfirmedEmail(params.order)
        : await buildCustomerOrderConfirmedEmailSimple({
            orderNumber: params.orderNumber,
            total: params.total
          });
    } catch {
      template = await buildCustomerOrderConfirmedEmailSimple({
        orderNumber: params.orderNumber,
        total: params.total
      });
    }
  }

  try {
    await resend.emails.send({
      from: await getResendFromOrders(),
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
  const recipients = await resolveNotificationRecipientEmails("low_stock");
  if (!resend || !recipients.length) return;
  await resend.emails.send({
    from: await getResendFromAlertsStore(),
    to: recipients,
    subject: `Low Stock Alert — ${productName}`,
    html: `<p>Product <strong>${productName}</strong> is out of stock.</p>`
  });
}
