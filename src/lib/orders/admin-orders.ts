import { normalizeOrderItems } from "@/lib/orders/order-items";
import {
  formatRefundDate,
  refundAmountForOrder,
  REFUND_SLA_LABEL,
  REFUND_SLA_SHORT,
  REFUND_COMPLETED_TOOLTIP,
  REFUND_PENDING_TOOLTIP,
  shouldShowRefundSection
} from "@/lib/orders/refunds";
import { getStageLabel } from "@/lib/orders/status-config";
import type { Order, PaymentStatus } from "@/types";

export { ORDER_STATUSES } from "@/lib/orders/status-config";
export {
  getStageLabel,
  getStatusPillClass as getStagePillClass,
  getStatusFlatClass,
  orderStatusLabel
} from "@/lib/orders/status-config";

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  upi: "UPI",
  card: "Card",
  netbanking: "Net Banking",
  wallet: "Wallet",
  cod: "COD"
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  refunded: "bg-slate-100 text-slate-800",
  refund_pending: "bg-yellow-100 text-yellow-900",
  failed: "bg-red-100 text-red-800"
};

export const PAGE_SIZE = 20;

export type OrderListRow = Order & {
  review_count?: number;
};

export function customerName(order: Order) {
  return order.shipping_address?.name ?? order.guest_email ?? "Guest";
}

export function customerEmail(order: Order) {
  return order.guest_email ?? order.shipping_address?.email ?? "—";
}

export function customerPhone(order: Order) {
  return order.shipping_address?.phone ?? "—";
}

export function itemsCount(order: Order) {
  return normalizeOrderItems(order.items).reduce((sum, item) => sum + item.quantity, 0);
}

export function formatOrderDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export function formatOrderTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

export function paymentMethodLabel(method: string | undefined) {
  if (!method) return "—";
  return PAYMENT_METHOD_LABELS[method] ?? method.toUpperCase();
}

export function paymentStatusLabel(status: PaymentStatus | string | undefined) {
  if (!status) return "—";
  if (status === "refund_pending") return "Refund Pending";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function paymentStatusTooltip(status: PaymentStatus | string | undefined) {
  if (status === "refund_pending") return REFUND_PENDING_TOOLTIP;
  if (status === "refunded") return REFUND_COMPLETED_TOOLTIP;
  return undefined;
}

export function formatCurrency(amount: number) {
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

export function formatOrderDateTime(iso: string | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function trackingNumber(order: OrderListRow) {
  return order.tracking_id?.trim() || order.tracking_number?.trim() || "—";
}

export function shippingDate(order: OrderListRow) {
  if (order.shipping_date) return formatOrderDateTime(order.shipping_date);
  const status = order.status;
  if (status === "out_for_delivery" || status === "delivered" || (status as string) === "shipped") {
    return formatOrderDateTime(order.updated_at);
  }
  return "—";
}

export function deliveredDate(order: OrderListRow) {
  if (order.status !== "delivered") return "—";
  return formatOrderDateTime(order.delivery_confirmed_at ?? order.updated_at);
}

export function cancellationReason(order: OrderListRow) {
  return order.notes?.trim() || "—";
}

export function refundStatusLabel(paymentStatus: PaymentStatus | string | undefined) {
  if (!paymentStatus) return "—";
  if (paymentStatus === "refunded") return "Refunded";
  if (paymentStatus === "refund_pending") return "Refund Pending";
  if (paymentStatus === "paid") return "Paid (no refund)";
  if (paymentStatus === "pending") return "Pending";
  if (paymentStatus === "failed") return "Failed";
  return paymentStatusLabel(paymentStatus);
}

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
