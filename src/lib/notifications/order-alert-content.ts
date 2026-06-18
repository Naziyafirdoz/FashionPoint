import { customerName, customerPhone, paymentMethodLabel, paymentStatusLabel } from "@/lib/orders/admin-orders";
import { formatShippingAddress } from "@/lib/orders/fulfillment-workflow";
import { normalizeOrderItems } from "@/lib/orders/order-items";
import type { Order } from "@/types";

function formatCurrency(amount: number): string {
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}


export type OrderAlertContent = {
  subject: string;
  title: string;
  whatsappText: string;
  html: string;
  pushTitle: string;
  pushBody: string;
  lines: string[];
};

export function buildNewOrderAlertContent(order: Order, baseUrl: string): OrderAlertContent {
  const items = normalizeOrderItems(order.items);
  const first = items[0];
  const name = customerName(order);
  const phone = customerPhone(order);
  const address = formatShippingAddress(order);
  const orderUrl = `${baseUrl}/admin/orders/${order.id}`;

  const productLines = items.map((line) => {
    const sku = line.sku?.trim() || "—";
    return [
      line.name,
      `SKU: ${sku}`,
      `Size: ${line.size} · Color: ${line.color}`,
      `Qty: ${line.quantity} · Price: ${formatCurrency(line.price * line.quantity)}`
    ].join("\n");
  });

  const lines = [
    "🛍 New Order Alert - Fashion Point",
    "",
    `Order ID: ${order.order_number}`,
    `Payment Method: ${paymentMethodLabel(order.payment_method)}`,
    `Payment Status: ${paymentStatusLabel(order.payment_status)}`,
    `Order Amount: ${formatCurrency(Number(order.total))}`,
    "",
    first?.image ? `[Product Image: ${first.image}]` : "",
    ...productLines,
    "",
    `Customer Name: ${name}`,
    `Customer Mobile: ${phone}`,
    "",
    "Shipping Address:",
    address,
    "",
    `View: ${orderUrl}`
  ].filter(Boolean);

  const htmlItems = items
    .map(
      (line) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">
          ${line.image ? `<img src="${line.image}" alt="" width="64" height="64" style="object-fit:cover;border-radius:8px;" />` : ""}
        </td>
        <td style="padding:8px;border-bottom:1px solid #eee;">
          <strong>${line.name}</strong><br/>
          SKU: ${line.sku?.trim() || "—"}<br/>
          Size: ${line.size} · Color: ${line.color}<br/>
          Qty: ${line.quantity} · ${formatCurrency(line.price * line.quantity)}
        </td>
      </tr>`
    )
    .join("");

  const html = `
    <h2>🛍 New Order Alert - Fashion Point</h2>
    <p><strong>Order ID:</strong> ${order.order_number}<br/>
    <strong>Payment Method:</strong> ${paymentMethodLabel(order.payment_method)}<br/>
    <strong>Payment Status:</strong> ${paymentStatusLabel(order.payment_status)}<br/>
    <strong>Order Amount:</strong> ${formatCurrency(Number(order.total))}</p>
    <table style="width:100%;border-collapse:collapse;">${htmlItems}</table>
    <p><strong>Customer:</strong> ${name}<br/><strong>Phone:</strong> ${phone}</p>
    <p><strong>Shipping Address:</strong><br/>${address.replace(/\n/g, "<br/>")}</p>
    <p><a href="${orderUrl}">Open order in admin</a></p>
  `;

  return {
    subject: `New Order ${order.order_number} — Fashion Point`,
    title: "New Order Alert",
    whatsappText: lines.join("\n"),
    html,
    pushTitle: "New Order Alert",
    pushBody: `${order.order_number} · ${name} · ${formatCurrency(Number(order.total))}`,
    lines
  };
}

export function buildWorkerPackedAlert(order: Order): OrderAlertContent {
  const text = `Worker has packed Order ${order.order_number}.\nReady for shipping.`;
  return {
    subject: `Order Packed — ${order.order_number}`,
    title: "Order Packed",
    whatsappText: text,
    html: `<p>${text}</p>`,
    pushTitle: "Order Packed",
    pushBody: text,
    lines: [text]
  };
}

export function buildReadyForDispatchAlert(order: Order): OrderAlertContent {
  const text = `Order ${order.order_number} is ready for dispatch.`;
  return {
    subject: `Ready For Dispatch — ${order.order_number}`,
    title: "Ready For Dispatch",
    whatsappText: text,
    html: `<p>${text}</p>`,
    pushTitle: "Ready For Dispatch",
    pushBody: text,
    lines: [text]
  };
}
