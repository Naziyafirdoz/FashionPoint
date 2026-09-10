import type { SupabaseClient } from "@supabase/supabase-js";
import {
  customerEmailLogEventForTemplate,
  type EmailTemplateEventKey
} from "@/lib/settings/email-templates";
import {
  logCustomerEmailDelivery,
  wasCustomerEmailSent
} from "@/lib/server/notifications/customer-email-dedup";
import { renderCustomerOrderEmailFromTemplate } from "@/lib/server/notifications/email-template-system";
import { getResendFromOrders } from "@/lib/server/resend-from-addresses";
import { createServiceClient } from "@/lib/supabase";
import type { Order } from "@/types";

/**
 * Send a customer order email using the active Settings → Email Templates row.
 * Keeps existing dedup + Resend behavior; falls back to branded code defaults
 * when the DB template table is missing.
 */
export async function sendTemplatedCustomerOrderEmail(params: {
  eventKey: EmailTemplateEventKey;
  order: Order;
  to?: string | null;
  db?: SupabaseClient | null;
  deliveryStaffName?: string | null;
}): Promise<"sent" | "skipped" | "failed"> {
  const db = params.db ?? createServiceClient();
  const logEvent = customerEmailLogEventForTemplate(params.eventKey);
  const to =
    params.to?.trim() ||
    params.order.shipping_address?.email?.trim() ||
    params.order.guest_email?.trim() ||
    "";

  if (!to) {
    if (db) {
      await logCustomerEmailDelivery(db, {
        orderId: params.order.id,
        event: logEvent,
        success: false,
        errorMessage: "Customer email not found"
      });
    }
    return "failed";
  }

  if (db && (await wasCustomerEmailSent(db, params.order.id, logEvent))) {
    return "skipped";
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    if (db) {
      await logCustomerEmailDelivery(db, {
        orderId: params.order.id,
        event: logEvent,
        success: false,
        errorMessage: "RESEND_API_KEY not configured"
      });
    }
    return "failed";
  }

  try {
    const template = await renderCustomerOrderEmailFromTemplate(params.eventKey, params.order, {
      db,
      deliveryStaffName: params.deliveryStaffName
    });

    console.log("[customer-email] template source", {
      eventKey: params.eventKey,
      orderId: params.order.id,
      source: template.source
    });

    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: await getResendFromOrders(),
      to,
      subject: template.subject,
      html: template.html
    });

    if (db) {
      await logCustomerEmailDelivery(db, {
        orderId: params.order.id,
        event: logEvent,
        success: true
      });
    }
    return "sent";
  } catch (err) {
    if (db) {
      await logCustomerEmailDelivery(db, {
        orderId: params.order.id,
        event: logEvent,
        success: false,
        errorMessage: err instanceof Error ? err.message : String(err)
      });
    }
    throw err;
  }
}
