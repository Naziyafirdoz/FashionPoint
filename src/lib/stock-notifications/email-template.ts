import { toAbsoluteHttpsUrl } from "@/lib/server/notifications/email-image";
import { STORE_NAME } from "@/lib/site-config";
import { buildProductPageUrl } from "@/lib/stock-notifications/product-url";

const MAROON = "#7B0D2B";
const GOLD = "#B8860B";
const CARD_BG = "#FAF8F6";
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

function emailShell(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(title)}</title></head><body style="margin:0;background:#F3EFEB;font-family:system-ui,-apple-system,sans-serif;color:${TEXT};"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:20px 12px;"><table width="100%" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;"><tr><td style="background:${MAROON};padding:20px 16px;text-align:center;"><p style="margin:0;font-size:20px;font-weight:700;color:#fff;letter-spacing:0.02em;">Fashion Point</p><p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.12em;">Style. Confidence. You.</p></td></tr><tr><td style="padding:24px 20px;">${body}</td></tr><tr><td style="padding:20px 16px;text-align:center;border-top:1px solid ${BORDER};"><p style="margin:0 0 4px;font-size:14px;color:${MAROON};font-weight:600;">Thanks,</p><p style="margin:0;font-size:14px;color:${TEXT};font-weight:600;">${escapeHtml(STORE_NAME)}</p><p style="margin:8px 0 0;font-size:12px;color:${MUTED};">Vijayawada</p></td></tr></table></td></tr></table></body></html>`;
}

function primaryButtonHtml(label: string, href: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px auto 0;"><tr><td style="border-radius:999px;background:${MAROON};"><a href="${href}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a></td></tr></table>`;
}

function formatRequestTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata"
    });
  } catch {
    return iso;
  }
}

export function buildBackInStockEmail(params: {
  customerName: string;
  productName: string;
  productSlug: string;
  productImageUrl?: string | null;
}): { subject: string; html: string } {
  const productUrl = buildProductPageUrl(params.productSlug);
  const subject = `🎉 Your requested ${params.productName} is back in stock!`;

  const imageUrl = toAbsoluteHttpsUrl(params.productImageUrl ?? undefined);
  const imageBlock = imageUrl
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;background:${CARD_BG};border:1px solid ${BORDER};border-radius:12px;"><tr><td style="padding:16px;text-align:center;"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(params.productName)}" width="200" style="max-width:100%;height:auto;border-radius:8px;display:block;margin:0 auto;"/></td></tr></table>`
    : "";

  const buttonBlock = productUrl
    ? primaryButtonHtml("View Product", productUrl)
    : `<p style="margin:20px 0 0;font-size:14px;color:${MUTED};">Visit our store to shop this item.</p>`;

  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hi ${escapeHtml(params.customerName)},</p>
    <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:${MAROON};">Great news!</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">The product you requested is now <strong>Back In Stock</strong>.</p>
    ${imageBlock}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 8px;background:${CARD_BG};border:1px solid ${BORDER};border-radius:12px;"><tr><td style="padding:16px;"><p style="margin:0 0 6px;font-size:12px;font-weight:700;color:${GOLD};text-transform:uppercase;letter-spacing:0.5px;">Product</p><p style="margin:0;font-size:17px;font-weight:600;color:${TEXT};">${escapeHtml(params.productName)}</p></td></tr></table>
    <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:${MUTED};">Click below to view and order before it sells out again.</p>
    ${buttonBlock}
  `;

  return { subject, html: emailShell("Back In Stock", body) };
}

export function buildAdminBackInStockRequestEmail(params: {
  customerName: string;
  customerEmail: string;
  productName: string;
  requestedAt: string;
  inventoryUrl: string;
  requestsPageUrl: string;
}): { subject: string; html: string } {
  const subject = "New Back In Stock Request";

  const body = `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:${MAROON};">New Back In Stock Request</h2>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${MUTED};">A customer wants to be notified when an out-of-stock product becomes available again.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;background:${CARD_BG};border:1px solid ${BORDER};border-radius:12px;">
      <tr><td style="padding:14px 16px;border-bottom:1px solid ${BORDER};"><span style="color:${MUTED};font-size:13px;">Customer Name</span><br/><strong style="font-size:15px;">${escapeHtml(params.customerName)}</strong></td></tr>
      <tr><td style="padding:14px 16px;border-bottom:1px solid ${BORDER};"><span style="color:${MUTED};font-size:13px;">Customer Email</span><br/><strong style="font-size:15px;">${escapeHtml(params.customerEmail)}</strong></td></tr>
      <tr><td style="padding:14px 16px;border-bottom:1px solid ${BORDER};"><span style="color:${MUTED};font-size:13px;">Product Name</span><br/><strong style="font-size:15px;">${escapeHtml(params.productName)}</strong></td></tr>
      <tr><td style="padding:14px 16px;"><span style="color:${MUTED};font-size:13px;">Request Time</span><br/><strong style="font-size:15px;">${escapeHtml(formatRequestTime(params.requestedAt))}</strong></td></tr>
    </table>
    ${primaryButtonHtml("View Back In Stock Requests", params.requestsPageUrl)}
    <p style="margin:20px 0 0;text-align:center;font-size:13px;"><a href="${params.inventoryUrl}" style="color:${MAROON};font-weight:600;">Open Admin Inventory</a></p>
  `;

  return { subject, html: emailShell(subject, body) };
}

export function buildDiscontinuedProductEmail(params: {
  customerName: string;
  productName: string;
  browseUrl: string;
}): { subject: string; html: string } {
  const subject = `Update on ${params.productName}`;

  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hi ${escapeHtml(params.customerName)},</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Thank you for your interest in <strong>${escapeHtml(params.productName)}</strong>.</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">We are sorry to let you know that this product has been discontinued and will not be returning to our store.</p>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:${MUTED};">We would love for you to explore similar styles that are available now.</p>
    ${primaryButtonHtml("Browse Similar Products", params.browseUrl)}
  `;

  return { subject, html: emailShell("Product Discontinued", body) };
}

export function buildManualCancellationEmail(params: {
  customerName: string;
  productName: string;
  browseUrl: string;
}): { subject: string; html: string } {
  const subject = "Unfortunately, We Couldn't Restock Your Requested Product";

  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hello ${escapeHtml(params.customerName)},</p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Thank you for requesting to be notified about:</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;background:${CARD_BG};border:1px solid ${BORDER};border-radius:12px;"><tr><td style="padding:16px;"><p style="margin:0;font-size:17px;font-weight:600;color:${TEXT};">${escapeHtml(params.productName)}</p></td></tr></table>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Unfortunately, we were unable to restock this product at this time.</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">We sincerely apologize for the inconvenience.</p>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:${MUTED};">You can explore similar products from our collection using the button below.</p>
    ${primaryButtonHtml("Browse Similar Products", params.browseUrl)}
    <p style="margin:28px 0 0;font-size:14px;line-height:1.7;color:${MUTED};text-align:center;">Thank you for choosing Fashion Point.</p>
  `;

  return { subject, html: emailShell("Request Cancelled", body) };
}
