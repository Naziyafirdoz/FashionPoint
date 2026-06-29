import {
  customerName,
  customerPhone,
  formatCurrency,
  paymentMethodLabel,
  paymentStatusLabel
} from "@/lib/orders/admin-orders";
import { normalizeOrderItems } from "@/lib/orders/order-items";
import {
  formatPickupTimeDisplay,
  getRapidoDeliveryDetails
} from "@/lib/orders/rapido-delivery-metadata";
import { formatReminderDelayLabel } from "@/lib/server/notifications/reminder-config";
import { buildAdminNewOrderPremiumEmail } from "@/lib/server/notifications/build-admin-new-order-email";
import { emailAppUrl } from "@/lib/server/notifications/email-app-url";
import { STORE_TIMEZONE } from "@/lib/site-config";
import type { OrderEmailActionUrls } from "@/lib/server/order-actions/tokens";
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

export type { OrderEmailActionUrls };

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
  "Your order has been confirmed.",
  "We are preparing your parcel.",
  "We'll notify you when your order is shipped."
];

const CUSTOMER_PLACED_MESSAGES = [
  "Thank you for your order.",
  "We have successfully received your payment.",
  "Our team will review and prepare your parcel.",
  "We'll notify you when your order is confirmed."
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

function customerGreetingHtml(order: Order): string {
  const name = escapeHtml(customerName(order));
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${TEXT};">Hello ${name},</p>`;
}

function customerPlacedShippingAddressCardHtml(order: Order): string {
  const address = escapeHtml(formatAddressLinesOnly(order)).replace(/\n/g, "<br/>");
  return `${cardOpen()}<tr><td style="padding:16px;"><p style="margin:0 0 8px;font-size:12px;font-weight:700;color:${GOLD};text-transform:uppercase;">Shipping Address</p><p style="margin:0;font-size:14px;line-height:1.6;">${address}</p></td></tr>${cardClose()}`;
}

/** Admin emails: address lines only — no repeated customer name or phone. */function formatAddressLinesOnly(order: Order): string {
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
  preheader?: string;
  footer?: "standard" | "minimal";
};

function customerFooterHtml(): string {
  return `<tr><td style="padding:24px 16px;text-align:center;border-top:1px solid ${BORDER};"><p style="margin:0 0 6px;font-size:14px;color:${MAROON};font-weight:600;">❤️ Thank you for shopping with Fashion Point ❤️</p><p style="margin:0;font-size:12px;color:${MUTED};">Fashion Point • Vijayawada</p></td></tr>`;
}

function minimalFooterHtml(): string {
  return `<tr><td style="padding:20px 16px;text-align:center;border-top:1px solid ${BORDER};"><p style="margin:0;font-size:12px;color:${MUTED};">Fashion Point • Vijayawada</p></td></tr>`;
}

function emailShell(title: string, body: string, options?: EmailShellOptions): string {
  const preheaderBlock = options?.preheader ? preheaderHtml(options.preheader) : "";
  const footer =
    options?.footer === "minimal" ? minimalFooterHtml() : customerFooterHtml();

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(title)}</title></head><body style="margin:0;background:#F3EFEB;font-family:system-ui,-apple-system,sans-serif;color:${TEXT};"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:20px 12px;"><table width="100%" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;"><tr><td style="background:${MAROON};padding:18px 16px;text-align:center;color:#fff;font-size:18px;font-weight:700;">Fashion Point</td></tr><tr><td style="padding:24px 20px;">${preheaderBlock}${body}</td></tr>${footer}</table></td></tr></table></body></html>`;
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

function compactProductCardHtml(order: Order): string {
  const lines = normalizeOrderItems(order.items);
  if (!lines.length) {
    return `<p style="margin:0 0 16px;font-size:14px;color:${MUTED};">No items on this order.</p>`;
  }

  const itemsHtml = lines
    .map((line, index) => {
      const border =
        index < lines.length - 1
          ? `padding-bottom:14px;margin-bottom:14px;border-bottom:1px solid ${BORDER};`
          : "";
      return `
        <div style="${border}">
          <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:${TEXT};">${escapeHtml(line.name)}</p>
          <p style="margin:0 0 4px;font-size:13px;color:${MUTED};">Size: ${escapeHtml(line.size || "—")}</p>
          <p style="margin:0 0 4px;font-size:13px;color:${MUTED};">Color: ${escapeHtml(line.color || "—")}</p>
          <p style="margin:0 0 4px;font-size:13px;color:${MUTED};">Quantity: ${line.quantity}</p>
          <p style="margin:0;font-size:15px;font-weight:700;color:${MAROON};">${formatCurrency(line.price * line.quantity)}</p>
        </div>`;
    })
    .join("");

  return `${cardOpen()}<tr><td style="padding:16px;">${itemsHtml}</td></tr>${cardClose()}`;
}

function adminCustomerDetailsCardHtml(order: Order): string {
  return `
    ${cardOpen()}
      <tr>
        <td style="padding:16px;">
          <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:${GOLD};text-transform:uppercase;letter-spacing:0.5px;">Customer Details</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;line-height:1.8;">
            <tr>
              <td style="color:${MUTED};width:46%;">Customer Name</td>
              <td style="font-weight:600;">${escapeHtml(customerName(order))}</td>
            </tr>
            <tr>
              <td style="color:${MUTED};">Primary Mobile Number</td>
              <td style="font-weight:600;">${escapeHtml(customerPhone(order))}</td>
            </tr>
          </table>
        </td>
      </tr>
    ${cardClose()}`;
}

function adminShippingAddressStructuredCardHtml(order: Order): string {
  const a = order.shipping_address;
  const row = (label: string, value: string) =>
    `<tr><td style="color:${MUTED};padding:3px 0;width:42%;vertical-align:top;">${escapeHtml(label)}</td><td style="font-weight:600;color:${TEXT};">${escapeHtml(value || "—")}</td></tr>`;

  return `
    ${cardOpen()}
      <tr>
        <td style="padding:16px;">
          <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:${GOLD};text-transform:uppercase;letter-spacing:0.5px;">Shipping Address</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;line-height:1.8;">
            ${row("House / Flat", a?.house_flat || a?.address_line1 || "")}
            ${row("Street / Area", a?.street || a?.address_line2 || "")}
            ${row("Landmark", a?.landmark || "")}
            ${row("City", a?.city || "")}
            ${row("State", a?.state || "")}
            ${row("Pincode", a?.pincode || a?.postal_code || "")}
          </table>
        </td>
      </tr>
    ${cardClose()}`;
}

function orderSummaryCardHtml(order: Order, options?: { totalAmountLabel?: boolean }): string {
  const amountLabel = options?.totalAmountLabel ? "Total Amount" : "Amount";
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
              <td style="color:${MUTED};padding:2px 0;">${amountLabel}</td>
              <td style="font-size:18px;font-weight:700;color:${MAROON};">${formatCurrency(Number(order.total))}</td>
            </tr>
          </table>
        </td>
      </tr>
    ${cardClose()}`;
}

function customerOrderSummaryCardHtml(
  orderNumber: string,
  total: number,
  paymentMethod?: string,
  paymentStatus?: string
): string {
  const order = {
    order_number: orderNumber,
    total,
    payment_method: paymentMethod,
    payment_status: paymentStatus
  } as Order;
  return orderSummaryCardHtml(order, { totalAmountLabel: true });
}


function adminActionButtonsHtml(actionUrls: OrderEmailActionUrls): string {
  const dashboardUrl = emailAppUrl("/admin/dashboard");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0 0;">
    <tr>
      <td class="fp-btn-col" align="center" width="50%" style="padding:0 6px 0 0;">
        <a href="${actionUrls.approveUrl}" target="_blank" rel="noopener noreferrer" style="display:block;height:54px;line-height:54px;background-color:${MAROON};color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;text-align:center;">✓ Approve Order</a>
      </td>
      <td class="fp-btn-col" align="center" width="50%" style="padding:0 0 0 6px;">
        <a href="${escapeHtml(dashboardUrl)}" target="_blank" rel="noopener noreferrer" style="display:block;height:54px;line-height:54px;background-color:#FFFFFF;color:${MAROON};font-size:15px;font-weight:600;text-decoration:none;border-radius:12px;text-align:center;border:1px solid ${MAROON};">📋 Open Dashboard</a>
      </td>
    </tr>
  </table>`;
}

function adminGenericBody(order: Order, title: string): string {
  return `${sectionHeading(title)}${orderSummaryCardHtml(order)}${adminCustomerDetailsCardHtml(order)}${adminShippingAddressStructuredCardHtml(order)}`;
}

function resolveDeliveryPartnerLabel(order: Order): string {
  if (order.courier_partner?.trim()) return order.courier_partner.trim();
  if (order.delivery_partner?.trim()) return order.delivery_partner.trim();
  if (order.courier_name?.trim()) return order.courier_name.trim();
  return "Rapido";
}

function customerDeliveryPartnerCardHtml(order: Order): string {
  const rapido = getRapidoDeliveryDetails(order);
  const deliveryPartner = escapeHtml(resolveDeliveryPartnerLabel(order));
  const riderName = escapeHtml(rapido?.rider_name?.trim() || "—");
  const riderPhone = escapeHtml(rapido?.rider_phone?.trim() || "—");
  const vehicleNumber = escapeHtml(rapido?.vehicle_number?.trim() || "—");
  const dispatchedOn = rapido?.pickup_time
    ? escapeHtml(formatPickupTimeDisplay(rapido.pickup_time))
    : "—";
  const notes = rapido?.notes?.trim()
    ? `<tr><td style="color:${MUTED};padding:2px 0;vertical-align:top;">Notes</td><td style="font-weight:600;color:${TEXT};">${escapeHtml(rapido.notes.trim())}</td></tr>`
    : "";

  return `
    ${cardOpen()}
      <tr>
        <td style="padding:18px 16px;">
          <p style="margin:0 0 14px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:${GOLD};">Delivery Details</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;line-height:1.9;">
            <tr><td style="color:${MUTED};width:46%;vertical-align:top;">Delivery Partner</td><td style="font-weight:600;">${deliveryPartner}</td></tr>
            <tr><td style="color:${MUTED};vertical-align:top;">Rider Name</td><td style="font-weight:600;">${riderName}</td></tr>
            <tr><td style="color:${MUTED};vertical-align:top;">Phone</td><td style="font-weight:600;">${riderPhone}</td></tr>
            <tr><td style="color:${MUTED};vertical-align:top;">Vehicle Number</td><td style="font-weight:600;">${vehicleNumber}</td></tr>
            <tr><td style="color:${MUTED};vertical-align:top;">Parcel Handed Over Time</td><td style="font-weight:600;">${dispatchedOn}</td></tr>
            ${notes}
          </table>
        </td>
      </tr>
    ${cardClose()}`;
}

function adminOrderShippedBody(order: Order): string {
  const rapido = getRapidoDeliveryDetails(order);
  const deliveryPartner = escapeHtml(resolveDeliveryPartnerLabel(order));
  const riderName = escapeHtml(rapido?.rider_name?.trim() || "—");
  const vehicleNumber = escapeHtml(rapido?.vehicle_number?.trim() || "—");

  return `
    ${sectionHeading("📦 Order Marked Shipped")}
    ${cardOpen()}
      <tr>
        <td style="padding:18px 16px;font-size:14px;line-height:1.9;">
          <p style="margin:0 0 6px;"><strong>Order ID:</strong> ${escapeHtml(order.order_number)}</p>
          <p style="margin:0 0 6px;"><strong>Customer Name:</strong> ${escapeHtml(customerName(order))}</p>
          <p style="margin:0 0 6px;"><strong>Mobile Number:</strong> ${escapeHtml(customerPhone(order))}</p>
          <p style="margin:0 0 6px;"><strong>Delivery Partner:</strong> ${deliveryPartner}</p>
          <p style="margin:0 0 6px;"><strong>Rider Name:</strong> ${riderName}</p>
          <p style="margin:0 0 6px;"><strong>Vehicle Number:</strong> ${vehicleNumber}</p>
          <p style="margin:0 0 6px;"><strong>Amount:</strong> ${formatCurrency(Number(order.total))}</p>
          <p style="margin:14px 0 0;font-size:12px;color:${MUTED};font-style:italic;">This email is for internal use only.</p>
        </td>
      </tr>
    ${cardClose()}`;
}

export function buildCustomerOrderShippedEmail(order: Order): { subject: string; html: string } {
  const body = `
    ${customerGreetingHtml(order)}
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${TEXT};">Good news! Your order has been shipped and is on its way.</p>
    ${customerDeliveryPartnerCardHtml(order)}`;

  return {
    subject: `📦 Your Order Has Been Shipped — ${order.order_number}`,
    html: emailShell(`Your Order Has Been Shipped — ${order.order_number}`, body, {
      preheader: `Your order ${order.order_number} has been shipped and is on its way.`
    })
  };
}

export function buildCustomerOrderPackingStartedEmail(order: Order): { subject: string; html: string } {
  const body = `
    ${customerGreetingHtml(order)}
    ${messageBlockHtml([
      "Good news!",
      "Your order is currently being packed carefully.",
      "No action is required.",
      "We'll notify you once it is ready for dispatch."
    ])}`;

  return {
    subject: `📦 Packing Started — ${order.order_number}`,
    html: emailShell(`Packing Started — ${order.order_number}`, body, {
      preheader: `Your order ${order.order_number} is being packed.`
    })
  };
}

export function buildCustomerOrderReadyForShippingEmail(order: Order): { subject: string; html: string } {
  const body = `
    ${customerGreetingHtml(order)}
    ${messageBlockHtml([
      "Your parcel is packed and ready for dispatch.",
      "We are arranging shipment.",
      "We'll notify you once the parcel is handed over to our delivery partner.",
      "No action is required."
    ])}`;

  return {
    subject: `🚚 Ready For Shipping — ${order.order_number}`,
    html: emailShell(`Ready For Shipping — ${order.order_number}`, body, {
      preheader: `Your order ${order.order_number} is ready for dispatch.`
    })
  };
}

export function buildCustomerOrderDeliveredEmail(order: Order): { subject: string; html: string } {
  const body = `
    ${customerGreetingHtml(order)}
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${TEXT};">Your order has been delivered successfully.</p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${TEXT};">Thank you for shopping with Fashion Point ❤️</p>
    <p style="margin:0;font-size:15px;line-height:1.6;color:${TEXT};">We hope to see you again.</p>`;

  return {
    subject: `🎉 Order Delivered — ${order.order_number}`,
    html: emailShell(`Order Delivered — ${order.order_number}`, body, {
      preheader: `Your order ${order.order_number} has been delivered.`,
      footer: "minimal"
    })
  };
}

export function buildPendingOrderReminderEmail(
  order: Order,
  actionUrls: OrderEmailActionUrls
): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:${TEXT};">This order has been awaiting approval for more than ${formatReminderDelayLabel()}.</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${TEXT};">Please review and approve the order.</p>
    ${orderSummaryCardHtml(order, { totalAmountLabel: true })}
    ${adminCustomerDetailsCardHtml(order)}
    ${adminShippingAddressStructuredCardHtml(order)}
    ${adminActionButtonsHtml(actionUrls)}`;
  return {
    subject: `🔔 Pending Order Reminder — ${order.order_number}`,
    html: emailShell(`Pending Order Reminder — ${order.order_number}`, body, {
      preheader: PREHEADER_ADMIN_NEW_ORDER,
      footer: "minimal"
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
      return `🚚 Order ${order.order_number} Ready For Shipping`;
    case "shipped":
      return `Order ${order.order_number} Shipped`;
    default:
      return `Order ${order.order_number} Update`;
  }
}

export async function buildOrderEmailTemplate(
  order: Order,
  event: OrderNotificationEvent,
  actionUrls?: OrderEmailActionUrls
): Promise<{ subject: string; html: string }> {
  if (event === "new_order" && actionUrls) {
    return buildAdminNewOrderPremiumEmail(order, actionUrls);
  }

  const title = eventTitle(event, order);
  const body =
    event === "shipped"
      ? adminOrderShippedBody(order)
      : adminGenericBody(order, title);

  const subject =
    event === "shipped"
        ? `📦 Order Marked Shipped — ${order.order_number}`
        : event === "ready_for_shipping" || event === "ready_for_dispatch"
          ? `🚚 Order ${order.order_number} Ready For Shipping`
          : `${title} — ${order.order_number}`;

  return {
    subject,
    html: emailShell(title, body, {
      preheader: event === "new_order" ? PREHEADER_ADMIN_NEW_ORDER : undefined,
      footer: "minimal"
    })
  };
}

export function buildCustomerOrderReceivedEmail(order: Order): { subject: string; html: string } {
  const body = `
    ${customerGreetingHtml(order)}
    ${messageBlockHtml(CUSTOMER_PLACED_MESSAGES)}
    ${orderSummaryCardHtml(order, { totalAmountLabel: true })}
    ${compactProductCardHtml(order)}
    ${customerPlacedShippingAddressCardHtml(order)}`;

  return {
    subject: `🛍 Thanks for Placing Your Order — ${order.order_number}`,
    html: emailShell(`Thanks for Placing Your Order — ${order.order_number}`, body, {
      preheader: PREHEADER_CUSTOMER_PLACED
    })
  };
}

export function buildCustomerOrderConfirmedEmail(order: Order): { subject: string; html: string } {
  const body = `
    ${customerGreetingHtml(order)}
    ${messageBlockHtml(CUSTOMER_CONFIRMED_MESSAGES)}
    ${orderSummaryCardHtml(order, { totalAmountLabel: true })}`;

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
  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${TEXT};">Hello,</p>
    ${messageBlockHtml(CUSTOMER_CONFIRMED_MESSAGES)}
    ${customerOrderSummaryCardHtml(params.orderNumber, params.total, "online", "paid")}`;

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

export function buildNotificationTestEmail(sentAt: Date = new Date()): {
  subject: string;
  html: string;
} {
  const sentAtLabel = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: STORE_TIMEZONE
  }).format(sentAt);

  const body = `
    ${sectionHeading("Test Notification")}
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${TEXT};">Hello,</p>
    ${messageBlockHtml([
      "This is a test email from your Fashion Point notification system.",
      "If you received this email, your notification settings are configured correctly.",
      "No action is required."
    ])}
    ${cardOpen()}
      <tr>
        <td style="padding:16px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:${GOLD};text-transform:uppercase;letter-spacing:0.5px;">Sent at</p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:${TEXT};">${escapeHtml(sentAtLabel)}</p>
        </td>
      </tr>
    ${cardClose()}
  `;

  return {
    subject: "Fashion Point • Test Notification",
    html: emailShell("Test Notification", body, {
      preheader: "This is a test email from your Fashion Point notification system.",
      footer: "minimal"
    })
  };
}
