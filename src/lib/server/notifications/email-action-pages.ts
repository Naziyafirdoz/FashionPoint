import { adminOrderEmailUrl } from "@/lib/server/notifications/email-app-url";
import { getStoreInformation } from "@/lib/settings/store-information";
import { STORE_NAME } from "@/lib/site-config";

const MAROON = "#7B0D2B";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function pageShell(title: string, body: string): Promise<string> {
  const { storeName } = await getStoreInformation();
  const heading = storeName.trim() || STORE_NAME;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(title)}</title></head><body style="margin:0;font-family:system-ui,sans-serif;background:#FAF8F6;color:#1A1A1A;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;"><table width="100%" style="max-width:480px;background:#fff;border-radius:12px;overflow:hidden;"><tr><td style="background:${MAROON};padding:20px;text-align:center;color:#fff;font-weight:700;">${escapeHtml(heading)}</td></tr><tr><td style="padding:24px;">${body}</td></tr></table></td></tr></table></body></html>`;
}

function adminOrderLink(orderId: string): string {
  return adminOrderEmailUrl(orderId);
}

export function htmlResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}

export async function renderRemindScheduledPage(orderNumber: string, remindAt: string, orderId: string): Promise<string> {
  const when = new Date(remindAt).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
  return pageShell(
    "Reminder Scheduled",
    `<p style="margin:0 0 12px;font-size:18px;font-weight:700;">✓ Reminder Scheduled After 2 Hours</p>
     <p style="margin:0 0 8px;">Reminder scheduled after 2 hours.</p>
     <p style="margin:0 0 8px;">Order <strong>${escapeHtml(orderNumber)}</strong> was not approved.</p>
     <p style="margin:0 0 16px;color:#555;">You will be reminded on <strong>${escapeHtml(when)}</strong>.</p>
     <p style="margin:0;"><a href="${adminOrderLink(orderId)}" style="color:${MAROON};font-weight:600;">Open order in admin</a></p>`
  );
}

export async function renderRemindSkippedPage(orderNumber: string, orderId: string): Promise<string> {
  return pageShell(
    "Reminder Not Needed",
    `<p style="margin:0 0 12px;font-size:18px;font-weight:700;">Reminder skipped</p>
     <p style="margin:0 0 16px;">Order <strong>${escapeHtml(orderNumber)}</strong> is no longer awaiting approval.</p>
     <p style="margin:0;"><a href="${adminOrderLink(orderId)}" style="color:${MAROON};font-weight:600;">View order</a></p>`
  );
}

export async function renderRemindErrorPage(orderId: string): Promise<string> {
  return pageShell(
    "Reminder Failed",
    `<p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#B00020;">Unable to schedule reminder</p>
     <p style="margin:0 0 16px;">Please try again from the admin dashboard.</p>
     <p style="margin:0;"><a href="${adminOrderLink(orderId)}" style="color:${MAROON};font-weight:600;">Open order</a></p>`
  );
}

export async function renderInvalidTokenPage(): Promise<string> {
  return pageShell(
    "Invalid Link",
    `<p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#B00020;">Link expired or invalid.</p>
     <p style="margin:0;color:#555;">Please open the admin dashboard to manage this order.</p>`
  );
}

export async function renderTokenExpiredPage(): Promise<string> {
  return pageShell(
    "Link Expired",
    `<p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#B00020;">Link expired.</p>
     <p style="margin:0;color:#555;">Please open the admin dashboard to manage this order.</p>`
  );
}

export async function renderTokenUsedPage(): Promise<string> {
  return pageShell(
    "Link Already Used",
    `<p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#B00020;">Link already used.</p>
     <p style="margin:0;color:#555;">This action link has already been used.</p>`
  );
}

export async function renderAlreadyApprovedPage(orderNumber?: string): Promise<string> {
  const detail = orderNumber
    ? `Order <strong>${escapeHtml(orderNumber)}</strong> has already been approved.`
    : "This order has already been approved.";
  return pageShell(
    "Already Approved",
    `<p style="margin:0 0 12px;font-size:18px;font-weight:700;">This order has already been approved.</p>
     <p style="margin:0;color:#555;">${detail}</p>`
  );
}

export async function renderAlreadyDeliveredPage(orderNumber?: string): Promise<string> {
  const detail = orderNumber
    ? `Order <strong>${escapeHtml(orderNumber)}</strong> has already been delivered.`
    : "This order has already been delivered.";
  return pageShell(
    "Already Delivered",
    `<p style="margin:0 0 12px;font-size:18px;font-weight:700;">✓ Order already delivered</p>
     <p style="margin:0;color:#555;">${detail}</p>`
  );
}

export async function renderDeliveryForbiddenPage(message?: string): Promise<string> {
  return pageShell(
    "Access Denied",
    `<p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#B00020;">Delivery action not allowed</p>
     <p style="margin:0;color:#555;">${escapeHtml(
       message ||
         "You are not authorized to mark this delivery. Sign in with the assigned delivery staff account."
     )}</p>`
  );
}

export async function renderDeliveryNotEligiblePage(message?: string): Promise<string> {
  return pageShell(
    "Not Available",
    `<p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#B00020;">Delivery not available</p>
     <p style="margin:0;color:#555;">${escapeHtml(
       message || "This order is not eligible for delivery confirmation."
     )}</p>`
  );
}

export async function renderApproveSuccessPage(orderNumber: string, orderId: string): Promise<string> {
  return pageShell(
    "Order Approved",
    `<p style="margin:0 0 12px;font-size:18px;font-weight:700;">✓ Order Approved</p>
     <p style="margin:0 0 16px;">Order approved successfully.</p>
     <p style="margin:0 0 8px;">Order <strong>${escapeHtml(orderNumber)}</strong> has been confirmed.</p>
     <p style="margin:0;"><a href="${adminOrderLink(orderId)}" style="color:${MAROON};font-weight:600;">View order</a></p>`
  );
}
