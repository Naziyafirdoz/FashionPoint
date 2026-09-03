import type { SupabaseClient } from "@supabase/supabase-js";
import { buildCustomerOrderShippedEmail } from "@/lib/server/notifications/email-templates";
import {
  CUSTOMER_ORDER_SHIPPED_EVENT,
  logCustomerEmailDelivery,
  wasCustomerShippedEmailSent
} from "@/lib/server/notifications/customer-email-dedup";
import { getResendFromOrders } from "@/lib/server/resend-from-addresses";
import type { Order } from "@/types";

export const RAPIDO_SHIPPED_EMAIL_EVENT = "rapido_shipped_email";

/** Customer Rapido shipped email HTML (layout only — same template as standard shipped email). */
export async function buildRapidoShippedEmailHtml(order: Order): Promise<string> {
  return (await buildCustomerOrderShippedEmail(order)).html;
}

export async function sendRapidoShippedCustomerEmail(
  db: SupabaseClient,
  order: Order
): Promise<"sent" | "skipped" | "failed"> {
  if (await wasCustomerShippedEmailSent(db, order.id)) {
    return "skipped";
  }

  const email = order.shipping_address?.email ?? order.guest_email;
  if (!email) {
    await logCustomerEmailDelivery(db, {
      orderId: order.id,
      event: RAPIDO_SHIPPED_EMAIL_EVENT,
      success: false,
      errorMessage: "Customer email not found"
    });
    return "failed";
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    await logCustomerEmailDelivery(db, {
      orderId: order.id,
      event: RAPIDO_SHIPPED_EMAIL_EVENT,
      success: false,
      errorMessage: "RESEND_API_KEY not configured"
    });
    return "failed";
  }

  const template = await buildCustomerOrderShippedEmail(order);

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: await getResendFromOrders(),
      to: email,
      subject: template.subject,
      html: template.html
    });

    await logCustomerEmailDelivery(db, {
      orderId: order.id,
      event: CUSTOMER_ORDER_SHIPPED_EVENT,
      success: true
    });

    return "sent";
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    await logCustomerEmailDelivery(db, {
      orderId: order.id,
      event: CUSTOMER_ORDER_SHIPPED_EVENT,
      success: false,
      errorMessage: message
    });
    return "failed";
  }
}
