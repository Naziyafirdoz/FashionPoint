import { normalizeOrderItems } from "@/lib/orders/order-items";
import type { Order, PaymentStatus } from "@/types";

const REFUND_PENDING_TOOLTIP = "Refund will be processed within 4–5 business days.";
const REFUND_COMPLETED_TOOLTIP = "Refund successfully completed.";

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

export const PAGE_SIZE = 10;

/** Query value for Admin Orders filter: orders with null `branch_id`. */
export const LEGACY_BRANCH_FILTER = "legacy";

export const LEGACY_BRANCH_LABEL = "Legacy / Default";

export type OrderListRow = Order & {
  review_count?: number;
};

/** Admin Orders display only — never used for assignment, shipping, or ETA. */
export function formatAssignedBranchName(
  branchId?: string | null,
  branchName?: string | null
): string {
  const id = branchId?.trim() ?? "";
  if (!id || id.startsWith("legacy-")) return LEGACY_BRANCH_LABEL;
  const name = branchName?.trim() ?? "";
  return name || LEGACY_BRANCH_LABEL;
}

export function orderMatchesBranchFilter(order: Order, branchFilter: string): boolean {
  if (!branchFilter || branchFilter === "all") return true;
  const id = order.branch_id?.trim() ?? "";
  if (branchFilter === LEGACY_BRANCH_FILTER) return !id;
  return id === branchFilter;
}

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
