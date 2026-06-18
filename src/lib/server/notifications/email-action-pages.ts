const MAROON = "#7B0D2B";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pageShell(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(title)}</title></head><body style="margin:0;font-family:system-ui,sans-serif;background:#FAF8F6;color:#1A1A1A;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;"><table width="100%" style="max-width:480px;background:#fff;border-radius:12px;overflow:hidden;"><tr><td style="background:${MAROON};padding:20px;text-align:center;color:#fff;font-weight:700;">Fashion Point</td></tr><tr><td style="padding:24px;">${body}</td></tr></table></td></tr></table></body></html>`;
}

import { getEmailAppUrl } from "@/lib/server/notifications/email-app-url";

function adminOrderLink(orderId: string): string {
  const base = getEmailAppUrl();
  if (!base) return "#";
  return `${base}/admin/orders/${orderId}`;
}

export function htmlResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}

export function renderRemindScheduledPage(orderNumber: string, remindAt: string, orderId: string): string {
  const when = new Date(remindAt).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
  return pageShell(
    "Reminder Scheduled",
    `<p style="margin:0 0 12px;font-size:18px;font-weight:700;">🕒 Reminder scheduled</p>
     <p style="margin:0 0 8px;">Order <strong>${escapeHtml(orderNumber)}</strong> was not approved.</p>
     <p style="margin:0 0 16px;color:#555;">You will be reminded on <strong>${escapeHtml(when)}</strong>.</p>
     <p style="margin:0;"><a href="${adminOrderLink(orderId)}" style="color:${MAROON};font-weight:600;">Open order in admin</a></p>`
  );
}

export function renderRemindSkippedPage(orderNumber: string, orderId: string): string {
  return pageShell(
    "Reminder Not Needed",
    `<p style="margin:0 0 12px;font-size:18px;font-weight:700;">Reminder skipped</p>
     <p style="margin:0 0 16px;">Order <strong>${escapeHtml(orderNumber)}</strong> is no longer awaiting approval.</p>
     <p style="margin:0;"><a href="${adminOrderLink(orderId)}" style="color:${MAROON};font-weight:600;">View order</a></p>`
  );
}

export function renderRemindErrorPage(orderId: string): string {
  return pageShell(
    "Reminder Failed",
    `<p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#B00020;">Unable to schedule reminder</p>
     <p style="margin:0 0 16px;">Please try again from the admin dashboard.</p>
     <p style="margin:0;"><a href="${adminOrderLink(orderId)}" style="color:${MAROON};font-weight:600;">Open order</a></p>`
  );
}

export function renderApproveSuccessPage(orderNumber: string, orderId: string): string {
  return pageShell(
    "Order Approved",
    `<p style="margin:0 0 12px;font-size:18px;font-weight:700;">✅ Order approved</p>
     <p style="margin:0 0 16px;">Order <strong>${escapeHtml(orderNumber)}</strong> has been confirmed.</p>
     <p style="margin:0;"><a href="${adminOrderLink(orderId)}" style="color:${MAROON};font-weight:600;">View order</a></p>`
  );
}
