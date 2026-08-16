import type { SupabaseClient } from "@supabase/supabase-js";
import { buildCustomerOrderDeliveredEmail } from "@/lib/server/notifications/email-templates";
import { RESEND_FROM_ORDERS } from "@/lib/server/resend-from-addresses";
import type { Order } from "@/types";

export const DELIVERY_CONFIRMATION_EMAIL_EVENT = "delivery_confirmation_email";

export async function buildDeliveryConfirmationEmailHtml(order: Order): Promise<string> {
  return (await buildCustomerOrderDeliveredEmail(order)).html;
}

async function wasDeliveryConfirmationSent(db: SupabaseClient, orderId: string): Promise<boolean> {
  const { data } = await db
    .from("notification_logs")
    .select("id")
    .eq("order_id", orderId)
    .eq("event", DELIVERY_CONFIRMATION_EMAIL_EVENT)
    .eq("success", true)
    .maybeSingle();
  return Boolean(data);
}

export async function sendDeliveryConfirmationEmail(
  db: SupabaseClient,
  order: Order
): Promise<"sent" | "skipped" | "failed"> {
  if (await wasDeliveryConfirmationSent(db, order.id)) {
    return "skipped";
  }

  const email = order.shipping_address?.email ?? order.guest_email;
  if (!email) {
    await db.from("notification_logs").insert({
      order_id: order.id,
      channel: "email",
      event: DELIVERY_CONFIRMATION_EMAIL_EVENT,
      success: false,
      error_message: "Customer email not found"
    });
    return "failed";
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    await db.from("notification_logs").insert({
      order_id: order.id,
      channel: "email",
      event: DELIVERY_CONFIRMATION_EMAIL_EVENT,
      success: false,
      error_message: "RESEND_API_KEY not configured"
    });
    return "failed";
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);
    const template = await buildCustomerOrderDeliveredEmail(order);
    await resend.emails.send({
      from: RESEND_FROM_ORDERS,
      to: email,
      subject: template.subject,
      html: template.html
    });

    await db.from("notification_logs").insert({
      order_id: order.id,
      channel: "email",
      event: DELIVERY_CONFIRMATION_EMAIL_EVENT,
      success: true
    });

    return "sent";
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    await db.from("notification_logs").insert({
      order_id: order.id,
      channel: "email",
      event: DELIVERY_CONFIRMATION_EMAIL_EVENT,
      success: false,
      error_message: message
    });
    return "failed";
  }
}
