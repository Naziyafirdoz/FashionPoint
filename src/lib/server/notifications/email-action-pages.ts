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

import { adminOrderEmailUrl } from "@/lib/server/notifications/email-app-url";

function adminOrderLink(orderId: string): string {
  return adminOrderEmailUrl(orderId);
}

export function htmlResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}

export function renderInvalidTokenPage(): string {
  return pageShell(
    "Invalid Link",
    `<p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#B00020;">Link expired or invalid.</p>
     <p style="margin:0;color:#555;">Please open the admin dashboard to manage this order.</p>`
  );
}

export function renderTokenExpiredPage(): string {
  return pageShell(
    "Link Expired",
    `<p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#B00020;">Link expired.</p>
     <p style="margin:0;color:#555;">Please open the admin dashboard to manage this order.</p>`
  );
}

export function renderTokenUsedPage(): string {
  return pageShell(
    "Link Already Used",
    `<p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#B00020;">Link already used.</p>
     <p style="margin:0;color:#555;">This action link has already been used.</p>`
  );
}

export function renderAlreadyApprovedPage(orderNumber?: string): string {
  const detail = orderNumber
    ? `Order <strong>${escapeHtml(orderNumber)}</strong> has already been approved.`
    : "This order has already been approved.";
  return pageShell(
    "Already Approved",
    `<p style="margin:0 0 12px;font-size:18px;font-weight:700;">This order has already been approved.</p>
     <p style="margin:0;color:#555;">${detail}</p>`
  );
}

export function renderApproveSuccessPage(orderNumber: string, orderId: string): string {
  return pageShell(
    "Order Approved",
    `<p style="margin:0 0 12px;font-size:18px;font-weight:700;">✓ Order Approved</p>
     <p style="margin:0 0 16px;">Order approved successfully.</p>
     <p style="margin:0 0 8px;">Order <strong>${escapeHtml(orderNumber)}</strong> has been confirmed.</p>
     <p style="margin:0;"><a href="${adminOrderLink(orderId)}" style="color:${MAROON};font-weight:600;">View order</a></p>`
  );
}
