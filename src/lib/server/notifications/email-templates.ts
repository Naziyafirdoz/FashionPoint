import {
  customerName,
  customerPhone,
  formatCurrency,
  paymentMethodLabel,
  paymentStatusLabel
} from "@/lib/orders/admin-orders";
import { formatShippingAddress } from "@/lib/orders/fulfillment-workflow";
import { normalizeOrderItems } from "@/lib/orders/order-items";
import { formatReminderDelayLabel } from "@/lib/server/notifications/reminder-config";
import { emailAppUrl } from "@/lib/server/notifications/email-app-url";
import { resolveEmailProductImage } from "@/lib/server/notifications/email-image";
import type { OrderNotificationEvent } from "@/lib/notifications/types";
import type { Order } from "@/types";

const MAROON = "#7B0D2B";
const GOLD = "#B8860B";
const CARD_BG = "#FAF8F6";
const BORDER = "#E8E0DA";
const TEXT = "#1A1A1A";
const MUTED = "#5C5C5C";

function orderAdminUrl(orderId: string): string {
  return emailAppUrl(`/admin/orders/${orderId}`);
}

function approveUrl(orderId: string): string {
  return emailAppUrl(`/api/admin/orders/${orderId}/approve-order?via=email`);
}

function remindUrl(orderId: string): string {
  return emailAppUrl(`/api/admin/orders/${orderId}/remind-later?via=email`);
}

/** Email templates: online payments only — never show COD. */
function emailPaymentMethodLabel(method: string | undefined): string {
  if (!method || method.toLowerCase() === "cod") return "Online Payment";
  const label = paymentMethodLabel(method);
  return label === "COD" ? "Online Payment" : label;
}

function emailPaymentStatusLabel(status: string | undefined): string {
  if (!status) return "—";
  if (status.toLowerCase() === "paid") return "🟢 Paid";
  return paymentStatusLabel(status);
}

const CUSTOMER_CONFIRMED_MESSAGES = [
  "Thank you for your order.",
  "Fashion Point is preparing your parcel.",
  "Shipping updates will be shared once dispatched."
];

const CUSTOMER_PLACED_MESSAGES = [
  "Thank you for shopping with Fashion Point.",
  "We have successfully received your order and payment.",
  "Our team will review and prepare your parcel.",
  "You will receive another email once your order has been approved."
];

const PREHEADER_CUSTOMER_PLACED =
  "Thank you for shopping with Fashion Point. Your order has been received and is being reviewed.";
const PREHEADER_ADMIN_NEW_ORDER =
  "New paid order received. Review and approve the order.";
const PREHEADER_CUSTOMER_CONFIRMED =
  "Your order has been confirmed and is being prepared.";

function messageBlockHtml(lines: string[]): string {
  return lines
    .map(
      (line) =>
        `<p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:${TEXT};">${escapeHtml(line)}</p>`
    )
    .join("");
}

function orderTotalCardHtml(order: Order): string {
  return `${cardOpen()}<tr><td style="padding:16px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;"><tr><td style="color:${MUTED};">Order Amount</td><td style="font-size:18px;font-weight:700;color:${MAROON};text-align:right;">${formatCurrency(Number(order.total))}</td></tr></table></td></tr>${cardClose()}`;
}

function orderIdAmountCardHtml(orderNumber: string, total: number): string {
  return `${cardOpen()}<tr><td style="padding:16px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;"><tr><td style="color:${MUTED};padding:4px 0;">Order ID</td><td style="font-weight:700;color:${MAROON};text-align:right;">${escapeHtml(orderNumber)}</td></tr><tr><td style="color:${MUTED};padding:4px 0;">Amount</td><td style="font-weight:700;color:${GOLD};text-align:right;">${formatCurrency(total)}</td></tr></table></td></tr>${cardClose()}`;
}

function shippingAddressCardHtml(order: Order): string {
  const address = escapeHtml(formatShippingAddress(order)).replace(/\n/g, "<br/>");
  return `${cardOpen()}<tr><td style="padding:16px;"><p style="margin:0 0 8px;font-size:12px;font-weight:700;color:${GOLD};text-transform:uppercase;">Shipping Address</p><p style="margin:0;font-size:14px;line-height:1.6;">${address}</p></td></tr>${cardClose()}`;
}

/** Admin emails: address lines only — no repeated customer name or phone. */
function formatAddressLinesOnly(order: Order): string {
  const a = order.shipping_address;
  if (!a) return "—";
  const parts = [
    a.house_flat || a.address_line1,
    a.street || a.address_line2,
    a.landmark,
    a.city,
    a.state,
    a.pincode || a.postal_code
  ].filter((part) => typeof part === "string" && part.trim());
  return parts.length ? parts.join("\n") : "—";
}

function adminShippingAddressCardHtml(order: Order): string {
  const address = escapeHtml(formatAddressLinesOnly(order)).replace(/\n/g, "<br/>");
  return `${cardOpen()}<tr><td style="padding:16px;"><p style="margin:0 0 8px;font-size:12px;font-weight:700;color:${GOLD};text-transform:uppercase;">Shipping Address</p><p style="margin:0;font-size:14px;line-height:1.6;">${address}</p></td></tr>${cardClose()}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function preheaderHtml(text: string): string {
  const filler = "&#847;&zwnj;&nbsp;".repeat(48);
  return `<div style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;max-height:0;max-width:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;">${escapeHtml(text)}${filler}</div>`;
}

type EmailShellOptions = {
  adminOrderId?: string;
  preheader?: string;
};

function emailShell(title: string, body: string, options?: EmailShellOptions): string {
  const adminOrderId = options?.adminOrderId;
  const preheaderBlock = options?.preheader ? preheaderHtml(options.preheader) : "";
  const footer = adminOrderId
    ? `<tr><td style="background:${MAROON};padding:16px;text-align:center;"><a href="${orderAdminUrl(adminOrderId)}" style="color:#fff;text-decoration:underline;font-size:14px;font-weight:600;">View Full Order Details</a></td></tr>`
    : `<tr><td style="padding:12px;text-align:center;font-size:11px;color:${MUTED};">Fashion Point • Vijayawada</td></tr>`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(title)}</title></head><body style="margin:0;background:#F3EFEB;font-family:system-ui,sans-serif;color:${TEXT};"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:16px 8px;"><table width="100%" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;"><tr><td style="background:${MAROON};padding:20px 18px;text-align:center;color:#fff;font-size:20px;font-weight:700;">🛍 Fashion Point</td></tr><tr><td style="padding:20px;">${preheaderBlock}${body}</td></tr>${footer}</table></td></tr></table></body></html>`;
}

function sectionHeading(text: string): string {
  return `<h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${MAROON};">${escapeHtml(text)}</h2>`;
}

function cardOpen(): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:16px;background-color:${CARD_BG};border:1px solid ${BORDER};border-radius:12px;">`;
}

function cardClose(): string {
  return `</table>`;
}

function productImageHtml(imageUrl: string | undefined, alt: string): string {
  if (!imageUrl) return "";
  const safeAlt = escapeHtml(alt);
  const safeUrl = escapeHtml(imageUrl);
  return `<img src="${safeUrl}" alt="${safeAlt}" width="120" height="120" style="display:block;width:120px;height:120px;object-fit:cover;border-radius:10px;border:1px solid ${BORDER};"/>`;
}

function productCardsHtml(order: Order): string {
  const lines = normalizeOrderItems(order.items);
  const rawItems = Array.isArray(order.items) ? order.items : [];
  if (!lines.length) {
    return `<p style="margin:0 0 12px;font-size:14px;color:${MUTED};">No line items on this order.</p>`;
  }
  return lines
    .map((line, index) => {
      const imageUrl = resolveEmailProductImage(rawItems[index], line.image);
      return productCardHtml(line, imageUrl);
    })
    .join("");
}

function productCardHtml(
  line: ReturnType<typeof normalizeOrderItems>[number],
  imageUrl?: string
): string {
  const lineTotal = formatCurrency(line.price * line.quantity);
  const imageBlock = productImageHtml(imageUrl, line.name);
  const imageCell = imageBlock
    ? `<td width="120" valign="top" style="padding-right:16px;">${imageBlock}</td>`
    : "";
  return `
    ${cardOpen()}
      <tr>
        <td style="padding:16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              ${imageCell}
              <td valign="top" style="font-size:14px;line-height:1.6;color:${TEXT};">
                <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:${MAROON};">${escapeHtml(line.name)}</p>
                <p style="margin:0 0 4px;"><span style="color:${MUTED};">SKU:</span> ${escapeHtml(line.sku?.trim() || "—")}</p>
                <p style="margin:0 0 4px;"><span style="color:${MUTED};">Size:</span> ${escapeHtml(line.size || "—")}</p>
                <p style="margin:0 0 4px;"><span style="color:${MUTED};">Color:</span> ${escapeHtml(line.color || "—")}</p>
                <p style="margin:0 0 4px;"><span style="color:${MUTED};">Quantity:</span> ${line.quantity}</p>
                <p style="margin:8px 0 0;font-size:16px;font-weight:700;color:${GOLD};">${lineTotal}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    ${cardClose()}`;
}

function orderSummaryCardHtml(order: Order): string {
  return `
    ${cardOpen()}
      <tr>
        <td style="padding:18px 16px;">
          <p style="margin:0 0 12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:${GOLD};">Order Summary</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;line-height:1.8;">
            <tr>
              <td style="color:${MUTED};padding:2px 0;width:42%;">Order ID</td>
              <td style="font-weight:600;color:${TEXT};">${escapeHtml(order.order_number)}</td>
            </tr>
            <tr>
              <td style="color:${MUTED};padding:2px 0;">Payment Method</td>
              <td style="font-weight:600;color:${TEXT};">${escapeHtml(emailPaymentMethodLabel(order.payment_method))}</td>
            </tr>
            <tr>
              <td style="color:${MUTED};padding:2px 0;">Payment Status</td>
              <td style="font-weight:600;color:${TEXT};">${escapeHtml(emailPaymentStatusLabel(order.payment_status))}</td>
            </tr>
            <tr>
              <td style="color:${MUTED};padding:2px 0;">Amount</td>
              <td style="font-size:18px;font-weight:700;color:${MAROON};">${formatCurrency(Number(order.total))}</td>
            </tr>
          </table>
        </td>
      </tr>
    ${cardClose()}`;
}

function customerDetailsCardHtml(order: Order): string {
  const name = escapeHtml(customerName(order));
  const phone = escapeHtml(customerPhone(order));
  return `${cardOpen()}<tr><td style="padding:16px;"><p style="margin:0 0 8px;font-size:12px;font-weight:700;color:${GOLD};text-transform:uppercase;">Customer Details</p><p style="margin:0 0 4px;font-size:14px;font-weight:700;">${name}</p><p style="margin:0;font-size:14px;">${phone}</p></td></tr>${cardClose()}`;
}

function adminActionButtonsHtml(orderId: string): string {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px;">
      <tr>
        <td align="center" style="padding:4px;">
          <a href="${approveUrl(orderId)}" target="_blank" rel="noopener noreferrer"
             style="display:inline-block;min-width:200px;padding:14px 24px;background-color:#2E7D32;color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;text-align:center;box-sizing:border-box;">
            ✅ Approve Order
          </a>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:4px;">
          <a href="${remindUrl(orderId)}" target="_blank" rel="noopener noreferrer"
             style="display:inline-block;min-width:200px;padding:14px 24px;background-color:${GOLD};color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;text-align:center;box-sizing:border-box;">
            🕒 Remind Me Later
          </a>
        </td>
      </tr>
    </table>`;
}

function adminNewOrderBody(order: Order): string {
  return `${sectionHeading("New Order Alert")}${orderSummaryCardHtml(order)}${productCardsHtml(order)}${customerDetailsCardHtml(order)}${adminShippingAddressCardHtml(order)}${adminActionButtonsHtml(order.id)}`;
}

function adminGenericBody(order: Order, title: string): string {
  return `${sectionHeading(title)}${orderSummaryCardHtml(order)}${productCardsHtml(order)}${customerDetailsCardHtml(order)}${adminShippingAddressCardHtml(order)}`;
}

export function buildPendingOrderReminderEmail(order: Order): { subject: string; html: string } {
  const body = `${sectionHeading("Pending Order Reminder")}<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">This order has been awaiting approval for more than ${formatReminderDelayLabel()}.</p>${orderSummaryCardHtml(order)}${productCardsHtml(order)}${customerDetailsCardHtml(order)}${adminShippingAddressCardHtml(order)}${adminActionButtonsHtml(order.id)}`;
  return {
    subject: `🔔 Pending Order Reminder — ${order.order_number}`,
    html: emailShell(`Pending Order Reminder — ${order.order_number}`, body, {
      adminOrderId: order.id,
      preheader: PREHEADER_ADMIN_NEW_ORDER
    })
  };
}

function eventTitle(event: OrderNotificationEvent, order: Order): string {
  switch (event) {
    case "new_order":
      return "New Order Alert";
    case "packing_assigned":
      return "Packing Assigned";
    case "packed":
    case "worker_packed":
      return `Worker Packed Order ${order.order_number}`;
    case "ready_for_shipping":
    case "ready_for_dispatch":
      return `Order ${order.order_number} Ready For Dispatch`;
    case "shipped":
      return `Order ${order.order_number} Shipped`;
    default:
      return `Order ${order.order_number} Update`;
  }
}

export function buildOrderEmailTemplate(
  order: Order,
  event: OrderNotificationEvent
): { subject: string; html: string } {
  const title = eventTitle(event, order);
  const body =
    event === "new_order" ? adminNewOrderBody(order) : adminGenericBody(order, title);

  const subject =
    event === "new_order"
      ? `🛍 New Order Alert — ${order.order_number}`
      : `${title} — ${order.order_number}`;

  return {
    subject,
    html: emailShell(title, body, {
      adminOrderId: order.id,
      preheader: event === "new_order" ? PREHEADER_ADMIN_NEW_ORDER : undefined
    })
  };
}

export function buildCustomerOrderReceivedEmail(order: Order): { subject: string; html: string } {
  const body = `<p style="margin:0 0 6px;font-size:14px;font-weight:600;color:${GOLD};">🛍 Thanks for Placing Your Order</p>${sectionHeading(`Order ${escapeHtml(order.order_number)}`)}${messageBlockHtml(CUSTOMER_PLACED_MESSAGES)}${productCardsHtml(order)}${orderTotalCardHtml(order)}${shippingAddressCardHtml(order)}`;

  return {
    subject: `🛍 Thanks for Placing Your Order — ${order.order_number}`,
    html: emailShell(`Thanks for Placing Your Order — ${order.order_number}`, body, {
      preheader: PREHEADER_CUSTOMER_PLACED
    })
  };
}

export function buildCustomerOrderConfirmedEmail(order: Order): { subject: string; html: string } {
  const body = `<p style="margin:0 0 6px;font-size:14px;font-weight:600;color:${GOLD};">✓ Order Confirmed</p>${sectionHeading(`Order ${escapeHtml(order.order_number)}`)}${messageBlockHtml(CUSTOMER_CONFIRMED_MESSAGES)}${orderIdAmountCardHtml(order.order_number, Number(order.total))}`;

  return {
    subject: `✅ Order Confirmed — ${order.order_number}`,
    html: emailShell(`Order Confirmed — ${order.order_number}`, body, {
      preheader: PREHEADER_CUSTOMER_CONFIRMED
    })
  };
}

export function buildCustomerOrderConfirmedEmailSimple(params: {
  orderNumber: string;
  total: number;
}): { subject: string; html: string } {
  const body = `<p style="margin:0 0 6px;font-size:14px;font-weight:600;color:${GOLD};">✓ Order Confirmed</p>${sectionHeading(`Order ${escapeHtml(params.orderNumber)}`)}${messageBlockHtml(CUSTOMER_CONFIRMED_MESSAGES)}${orderIdAmountCardHtml(params.orderNumber, params.total)}`;

  return {
    subject: `✅ Order Confirmed — ${params.orderNumber}`,
    html: emailShell(`Order Confirmed — ${params.orderNumber}`, body, {
      preheader: PREHEADER_CUSTOMER_CONFIRMED
    })
  };
}

export function buildOrderWhatsAppText(order: Order, event: OrderNotificationEvent): string {
  const items = normalizeOrderItems(order.items);
  const first = items[0];
  const lines = [
    `🛍 Fashion Point — ${eventTitle(event, order)}`,
    "",
    `Order ID: ${order.order_number}`,
    `Amount: ${formatCurrency(Number(order.total))}`,
    `Payment: ${emailPaymentMethodLabel(order.payment_method)} (${emailPaymentStatusLabel(order.payment_status)})`,
    "",
    first
      ? [
          first.name,
          `SKU: ${first.sku ?? "—"}`,
          `Size: ${first.size} · Qty: ${first.quantity}`,
          first.image ? `Image: ${first.image}` : null
        ]
          .filter(Boolean)
          .join("\n")
      : null,
    "",
    `Customer: ${customerName(order)}`,
    `Phone: ${customerPhone(order)}`,
    "",
    `View: ${orderAdminUrl(order.id)}`
  ].filter(Boolean);

  return lines.join("\n");
}

export function buildInAppMessage(order: Order, event: OrderNotificationEvent): string {
  const amount = formatCurrency(Number(order.total));
  switch (event) {
    case "new_order":
      return `${order.order_number} · ${customerName(order)} · ${amount}`;
    case "packing_assigned":
      return `Order ${order.order_number} assigned for packing.`;
    case "packed":
    case "worker_packed":
      return `Worker has packed Order ${order.order_number}. Ready for shipping.`;
    case "ready_for_shipping":
    case "ready_for_dispatch":
      return `Order ${order.order_number} is ready for dispatch.`;
    case "shipped":
      return `Order ${order.order_number} has been shipped.`;
    default:
      return order.order_number;
  }
}

export function buildPushPayload(order: Order, event: OrderNotificationEvent) {
  return {
    title: eventTitle(event, order),
    body: buildInAppMessage(order, event),
    url: `/admin/orders/${order.id}`
  };
}
