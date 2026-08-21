import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase";
import { logWorkflow } from "@/lib/orders/workflow-logger";
import {
  CUSTOMER_REFUND_PROCESSED_EVENT,
  logCustomerEmailDelivery,
  wasCustomerEmailSent
} from "@/lib/server/notifications/customer-email-dedup";
import { buildCustomerRefundProcessedEmail } from "@/lib/server/notifications/email-templates";
import { RESEND_FROM_ORDERS } from "@/lib/server/resend-from-addresses";
import type { Order } from "@/types";

export async function sendCustomerRefundProcessedEmail(order: Order): Promise<void> {
  const email = order.shipping_address?.email ?? order.guest_email;
  if (!email) {
    logWorkflow("customer_email_skipped", {
      orderId: order.id,
      orderNumber: order.order_number,
      event: CUSTOMER_REFUND_PROCESSED_EVENT,
      reason: "no_email"
    });
    return;
  }

  const db = createServiceClient();
  if (db && (await wasCustomerEmailSent(db, order.id, CUSTOMER_REFUND_PROCESSED_EVENT))) {
    return;
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    logWorkflow(
      "customer_email_failed",
      {
        orderId: order.id,
        orderNumber: order.order_number,
        event: CUSTOMER_REFUND_PROCESSED_EVENT,
        reason: "RESEND_API_KEY not configured"
      },
      "error"
    );
    return;
  }

  try {
    const { subject, html } = await buildCustomerRefundProcessedEmail(order);
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: RESEND_FROM_ORDERS,
      to: email,
      subject,
      html
    });
    if (db) {
      await logCustomerEmailDelivery(db, {
        orderId: order.id,
        event: CUSTOMER_REFUND_PROCESSED_EVENT,
        success: true
      });
    }
  } catch (error) {
    if (db) {
      await logCustomerEmailDelivery(db, {
        orderId: order.id,
        event: CUSTOMER_REFUND_PROCESSED_EVENT,
        success: false,
        errorMessage: error instanceof Error ? error.message : "Email send failed"
      });
    }
    logWorkflow(
      "customer_email_failed",
      {
        orderId: order.id,
        orderNumber: order.order_number,
        event: CUSTOMER_REFUND_PROCESSED_EVENT,
        error: error instanceof Error ? error.message : String(error)
      },
      "error"
    );
  }
}
