import {
  customerEmail,
  customerName,
  customerPhone,
  formatOrderDate,
  formatOrderTime,
  paymentMethodLabel,
  paymentStatusLabel
} from "@/lib/orders/admin-orders";
import { normalizeOrderItems } from "@/lib/orders/order-items";
import {
  formatRefundDate,
  refundAmountForOrder,
  REFUND_SLA_LABEL,
  REFUND_SLA_SHORT,
  shouldShowRefundSection
} from "@/lib/orders/refunds";
import { getStageLabel } from "@/lib/orders/status-config";
import type { Order } from "@/types";

export function printOrder(order: Order) {
  openInvoiceWindow(order, { autoPrint: true });
}

export function downloadInvoicePdf(order: Order) {
  openInvoiceWindow(order, { autoPrint: true, title: "Invoice" });
}

function openInvoiceWindow(order: Order, options: { autoPrint?: boolean; title?: string }) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(buildInvoiceHtml(order, options.title ?? "Invoice"));
  w.document.close();
  if (options.autoPrint) {
    w.onload = () => w.print();
  }
}

function buildInvoiceHtml(order: Order, docTitle: string): string {
  const lines = normalizeOrderItems(order.items);
  const itemsHtml = lines
    .map(
      (line) =>
        `<tr>
          <td>${line.name}</td>
          <td>${line.sku?.trim() || "—"}</td>
          <td>${line.size}</td>
          <td>${line.color}</td>
          <td>${line.quantity}</td>
          <td>₹${line.price.toLocaleString("en-IN")}</td>
          <td>₹${line.subtotal.toLocaleString("en-IN")}</td>
        </tr>`
    )
    .join("");
  const addr = order.shipping_address;
  const discount = Number(order.discount_amount) || 0;
  const tax = Number(order.tax_amount) || 0;

  return `
    <html><head><title>${docTitle} ${order.order_number}</title>
    <style>
      body{font-family:Georgia,serif;padding:32px;color:#222;max-width:800px;margin:0 auto}
      h1{color:#7b0d2b;margin-bottom:4px}
      .meta{color:#666;font-size:14px;margin-bottom:24px}
      table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
      th,td{border:1px solid #ddd;padding:10px;text-align:left}
      th{background:#f9f5f7;color:#7b0d2b}
      .summary{margin-top:24px;text-align:right;font-size:14px}
      .summary p{margin:4px 0}
      .total{font-size:18px;font-weight:bold;color:#7b0d2b;margin-top:8px}
      .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px}
    </style>
    </head><body>
    <h1>Fashion Point</h1>
    <p class="meta">Tax Invoice / Order Invoice</p>
    <p><strong>Invoice #:</strong> INV-${order.order_number}</p>
    <p><strong>Order Number:</strong> ${order.order_number}</p>
    <p><strong>Order Date:</strong> ${formatOrderDate(order.created_at)} ${formatOrderTime(order.created_at)}</p>
    <p><strong>Order Status:</strong> <span class="badge">${getStageLabel(order)}</span></p>
    <p><strong>Payment Status:</strong> <span class="badge">${paymentStatusLabel(order.payment_status)}</span></p>
    <p><strong>Payment Method:</strong> ${paymentMethodLabel(order.payment_method)}</p>
    <h2 style="margin-top:24px;font-size:16px;color:#7b0d2b">Bill To</h2>
    <p>${customerName(order)}<br/>${customerEmail(order)}<br/>${customerPhone(order)}</p>
    <h2 style="margin-top:16px;font-size:16px;color:#7b0d2b">Ship To</h2>
    <p>${addr?.line ?? addr?.line1 ?? ""}<br/>${addr?.city ?? ""}, ${addr?.state ?? ""} ${addr?.pincode ?? addr?.postal_code ?? ""}</p>
    <h2 style="margin-top:16px;font-size:16px;color:#7b0d2b">Items</h2>
    <table>
      <thead>
        <tr><th>Product</th><th>SKU</th><th>Size</th><th>Color</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div class="summary">
      <p>Subtotal: ₹${Number(order.subtotal).toLocaleString("en-IN")}</p>
      <p>Shipping: ₹${Number(order.shipping_amount).toLocaleString("en-IN")}</p>
      ${discount > 0 ? `<p>Discount: -₹${discount.toLocaleString("en-IN")}</p>` : ""}
      ${tax > 0 ? `<p>Tax: ₹${tax.toLocaleString("en-IN")}</p>` : ""}
      <p class="total">Total: ₹${Number(order.total).toLocaleString("en-IN")}</p>
    </div>
    ${order.tracking_id?.trim() ? `<p style="margin-top:16px"><strong>AWB:</strong> ${order.tracking_id}</p>` : ""}
    ${
      shouldShowRefundSection(order)
        ? `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #ddd">
      <h2 style="font-size:16px;color:#7b0d2b">Refund</h2>
      <p><strong>Refund Status:</strong> ${paymentStatusLabel(order.payment_status)}</p>
      <p><strong>Refund Amount:</strong> ₹${refundAmountForOrder(order).toLocaleString("en-IN")}</p>
      ${
        order.payment_status === "refunded"
          ? `<p><strong>Refund Date:</strong> ${formatRefundDate(order.refund_date)}</p>
      <p><strong>Refund Reference:</strong> ${order.refund_reference?.trim() || "—"}</p>`
          : `<p><strong>Refund Expected Within:</strong> ${REFUND_SLA_LABEL}</p>`
      }
      <p style="margin-top:8px;font-size:12px;color:#666">${REFUND_SLA_SHORT}</p>
    </div>`
        : ""
    }
  </body></html>
  `;
}
