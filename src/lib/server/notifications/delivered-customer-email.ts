import type { SupabaseClient } from "@supabase/supabase-js";
import { customerName } from "@/lib/orders/admin-orders";
import {
  CUSTOMER_ORDER_DELIVERED_EVENT,
  logCustomerEmailDelivery,
  wasCustomerEmailSent
} from "@/lib/server/notifications/customer-email-dedup";
import { resolveCustomerEmailBranchCopy } from "@/lib/server/notifications/customer-email-branch-copy";
import { emailAppUrl } from "@/lib/server/notifications/email-app-url";
import { getStoreInformation } from "@/lib/settings/store-information";
import { STORE_NAME } from "@/lib/site-config";
import { getResendFromOrders } from "@/lib/server/resend-from-addresses";
import type { Order } from "@/types";

const MAROON = "#7B0D2B";
const BORDER = "#E8E0DA";
const TEXT = "#1A1A1A";
const MUTED = "#5C5C5C";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function deliveredEmailShell(
  title: string,
  body: string,
  preheader: string,
  copy: { thankYou: string; locationLine: string },
  storeName: string
): string {
  const filler = "&#847;&zwnj;&nbsp;".repeat(48);
  const preheaderBlock = `<div style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;max-height:0;max-width:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;">${escapeHtml(preheader)}${filler}</div>`;
  const footer = `<tr><td style="padding:24px 16px;text-align:center;border-top:1px solid ${BORDER};"><p style="margin:0 0 6px;font-size:14px;color:${MAROON};font-weight:600;">${escapeHtml(copy.thankYou)}</p><p style="margin:0;font-size:12px;color:${MUTED};">${escapeHtml(copy.locationLine)}</p></td></tr>`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(title)}</title><style type="text/css">a.fp-my-orders-link,a.fp-my-orders-link span{color:${MAROON}!important;text-decoration:underline!important;font-weight:600!important;}</style></head><body style="margin:0;background:#F3EFEB;font-family:system-ui,-apple-system,sans-serif;color:${TEXT};"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:20px 12px;"><table width="100%" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;"><tr><td style="background:${MAROON};padding:18px 16px;text-align:center;color:#fff;font-size:18px;font-weight:700;">${escapeHtml(storeName)}</td></tr><tr><td style="padding:24px 20px;">${preheaderBlock}${body}</td></tr>${footer}</table></td></tr></table></body></html>`;
}

function myOrdersPageLink(url: string): string {
  const href = escapeHtml(url);
  const inline = `color:${MAROON};text-decoration:underline;font-weight:600;`;
  return `<a href="${href}" class="fp-my-orders-link" target="_blank" rel="noopener noreferrer" style="${inline}"><span style="${inline}">My Orders</span></a>`;
}

export async function buildDeliveredNotificationEmail(order: Order): Promise<{ subject: string; html: string }> {
  const [customerCopy, store] = await Promise.all([
    resolveCustomerEmailBranchCopy(order.branch_id),
    getStoreInformation()
  ]);
  const storeName = store.storeName.trim() || STORE_NAME;
  const name = escapeHtml(customerName(order));
  const myOrdersUrl = emailAppUrl("/account/orders");
  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${TEXT};">Hello ${name},</p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${TEXT};">Your order has been successfully delivered.</p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${TEXT};">We hope you enjoy your purchase.</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${TEXT};">${escapeHtml(customerCopy.thankYou)}</p>
    <p style="margin:0;font-size:15px;line-height:1.6;color:${TEXT};">We&apos;d love to hear your feedback. You can now review your purchased product from the ${myOrdersPageLink(myOrdersUrl)} page.</p>`;

  const preheader = `Your order ${order.order_number} has been delivered.`;

  return {
    subject: `✅ Order Delivered — ${order.order_number}`,
    html: deliveredEmailShell(`Order Delivered — ${order.order_number}`, body, preheader, customerCopy, storeName)
  };
}

export async function sendDeliveredCustomerEmail(
  db: SupabaseClient,
  order: Order
): Promise<"sent" | "skipped" | "failed"> {
  try {
    const { sendTemplatedCustomerOrderEmail } = await import(
      "@/lib/server/notifications/send-templated-customer-email"
    );
    return await sendTemplatedCustomerOrderEmail({
      eventKey: "order_delivered",
      order,
      db
    });
  } catch (err) {
    console.error("[delivered-customer-email] templated send failed", err);
    // Legacy hard-coded path if template pipeline throws unexpectedly
    if (await wasCustomerEmailSent(db, order.id, CUSTOMER_ORDER_DELIVERED_EVENT)) {
      return "skipped";
    }

    const email = order.shipping_address?.email ?? order.guest_email;
    if (!email) {
      await logCustomerEmailDelivery(db, {
        orderId: order.id,
        event: CUSTOMER_ORDER_DELIVERED_EVENT,
        success: false,
        errorMessage: "Customer email not found"
      });
      return "failed";
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      await logCustomerEmailDelivery(db, {
        orderId: order.id,
        event: CUSTOMER_ORDER_DELIVERED_EVENT,
        success: false,
        errorMessage: "RESEND_API_KEY not configured"
      });
      return "failed";
    }

    try {
      const template = await buildDeliveredNotificationEmail(order);
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
        event: CUSTOMER_ORDER_DELIVERED_EVENT,
        success: true
      });
      return "sent";
    } catch (legacyErr) {
      const message = legacyErr instanceof Error ? legacyErr.message : "Email send failed";
      await logCustomerEmailDelivery(db, {
        orderId: order.id,
        event: CUSTOMER_ORDER_DELIVERED_EVENT,
        success: false,
        errorMessage: message
      });
      return "failed";
    }
  }
}
