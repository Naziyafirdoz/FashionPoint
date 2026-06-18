/**
 * @deprecated Refund workflow UI is disabled. Legacy refund columns remain unused in admin/customer UI.
 * Returns, exchanges, and refund workflows are intentionally disabled per client requirements.
 * Do not re-enable without explicit business approval.
 */
import type { Order, OrderStatus, PaymentStatus } from "@/types";
import {
  canAdminMarkManualRefundCompleted,
  shouldShowManualRefundSection,
  validateManualRefundCompletion
} from "@/lib/orders/manual-refund";
import { isCodPayment, isPrepaidPayment } from "@/lib/orders/payment-rules";

export type OrderTimelineEntry = {
  label: string;
  at: string;
  notes?: string;
};

export type RefundSummary = {
  totalRefundRequests: number;
  refundPending: number;
  refundCompleted: number;
  totalRefundedAmount: number;
  averageProcessingDays: number | null;
};

export const REFUND_SLA_LABEL = "4–5 Business Days";
export const REFUND_SLA_SHORT =
  "Refunds are typically credited within 4–5 business days after refund initiation.";
export const REFUND_SLA_HELPER =
  "Refunds are usually credited to the original payment method within 4–5 business days.";
export const REFUND_PENDING_TOOLTIP =
  "Refund will be processed within 4–5 business days.";
export const REFUND_COMPLETED_TOOLTIP = "Refund successfully completed.";

export function addBusinessDays(start: Date, businessDays: number): Date {
  const result = new Date(start);
  let added = 0;
  while (added < businessDays) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

export function businessDaysBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (end <= start) return 0;

  let count = 0;
  const cursor = new Date(start);
  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1);
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

export function expectedRefundCompletionDate(initiatedAt: string | undefined | null): string | null {
  if (!initiatedAt) return null;
  return addBusinessDays(new Date(initiatedAt), 5).toISOString();
}

export function buildRefundInitiatedFields(
  order: Pick<Order, "total">
): Record<string, unknown> {
  const now = new Date();
  const initiated = now.toISOString();
  const expected = addBusinessDays(now, 5).toISOString();
  return {
    refund_amount: Number(order.total) || 0,
    refund_initiated_at: initiated,
    expected_refund_date: expected
  };
}

export function resolveExpectedRefundDate(order: Order): string | null {
  if (order.expected_refund_date) return order.expected_refund_date;
  return expectedRefundCompletionDate(order.refund_initiated_at);
}

export function wasOrderPaidBeforeRefund(paymentStatus: string | undefined): boolean {
  const s = (paymentStatus ?? "").toLowerCase();
  return s === "paid" || s === "refund_pending" || s === "refunded";
}

export function shouldShowRefundSection(order: Order): boolean {
  if (shouldShowManualRefundSection(order)) return true;
  return (
    order.status === "cancelled" &&
    isPrepaidPayment(order.payment_method) &&
    wasOrderPaidBeforeRefund(order.payment_status)
  );
}

export function canMarkAsRefunded(order: Order): boolean {
  if (canAdminMarkManualRefundCompleted(order)) return true;
  return (
    order.status === "cancelled" &&
    isPrepaidPayment(order.payment_method) &&
    order.payment_status === "refund_pending"
  );
}

export function refundAmountForOrder(order: Order): number {
  if (order.refund_amount != null && Number(order.refund_amount) > 0) {
    return Number(order.refund_amount);
  }
  return Number(order.total) || 0;
}

export function buildRefundInitiatedPayload(
  order: Pick<Order, "payment_method" | "payment_status" | "total">
): Record<string, unknown> | null {
  if (!isPrepaidPayment(order.payment_method)) return null;
  if (order.payment_status !== "paid") return null;

  return {
    payment_status: "refund_pending" satisfies PaymentStatus,
    ...buildRefundInitiatedFields(order)
  };
}

export function validateMarkRefunded(
  order: Order,
  input: { refund_reference?: string; refund_notes?: string }
): { ok: true } | { ok: false; error: string } {
  if (order.payment_status === "refunded") {
    return { ok: false, error: "This order has already been refunded" };
  }
  if (canAdminMarkManualRefundCompleted(order)) {
    return validateManualRefundCompletion(input);
  }
  if (!canMarkAsRefunded(order)) {
    return { ok: false, error: "Only prepaid cancelled orders with Refund Pending can be marked refunded" };
  }
  if (isCodPayment(order.payment_method)) {
    return { ok: false, error: "Refunds are not applicable to COD orders" };
  }
  if (order.payment_status !== "refund_pending") {
    return { ok: false, error: "Refund Pending on unpaid orders cannot be marked refunded" };
  }

  const amount = refundAmountForOrder(order);
  if (amount <= 0) {
    return { ok: false, error: "Refund amount is required" };
  }

  const reference = input.refund_reference?.trim();
  if (!reference) {
    return { ok: false, error: "Refund reference is required" };
  }

  return { ok: true };
}

export function buildMarkRefundedPayload(
  order: Order,
  input: { refund_reference: string; refund_notes?: string }
): Record<string, unknown> {
  const now = new Date().toISOString();
  const amount = refundAmountForOrder(order);

  return {
    payment_status: "refunded" satisfies PaymentStatus,
    refund_amount: amount,
    refund_date: now,
    refund_reference: input.refund_reference.trim(),
    refund_notes: input.refund_notes?.trim() || null,
    refund_initiated_at: order.refund_initiated_at ?? now,
    refund_status: "completed",
    refund_completed_at: now,
    updated_at: now
  };
}

function pushEntry(entries: OrderTimelineEntry[], label: string, at?: string | null) {
  if (!at) return;
  entries.push({ label, at });
}

export function buildOrderTimeline(
  order: Order,
  options?: { includeRefundEvents?: boolean }
): OrderTimelineEntry[] {
  const includeRefundEvents = options?.includeRefundEvents !== false;
  const entries: OrderTimelineEntry[] = [];
  const prepaid = isPrepaidPayment(order.payment_method);
  const payment = (order.payment_status ?? "").toLowerCase();

  pushEntry(entries, "Order Placed", order.created_at);

  if (prepaid && wasOrderPaidBeforeRefund(payment)) {
    pushEntry(entries, "Payment Received", order.created_at);
  }

  const activeStatuses: OrderStatus[] = ["processing", "out_for_delivery", "delivered", "cancelled"];
  if (activeStatuses.includes(order.status) && order.status !== "pending") {
    pushEntry(entries, "Order Processing", order.updated_at ?? order.created_at);
  }

  if (order.status === "cancelled") {
    pushEntry(entries, "Order Cancelled", order.cancelled_at ?? order.updated_at ?? order.created_at);
  }

  if (
    includeRefundEvents &&
    prepaid &&
    order.status === "cancelled" &&
    (payment === "refund_pending" || payment === "refunded")
  ) {
    pushEntry(entries, "Refund Initiated", order.refund_initiated_at ?? order.updated_at);
  }

  if (includeRefundEvents && payment === "refunded" && order.refund_date) {
    pushEntry(entries, "Refund Completed", order.refund_date);
  }

  return entries.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

export function computeRefundAnalytics(orders: Order[]): RefundSummary {
  let totalRefundRequests = 0;
  let refundPending = 0;
  let refundCompleted = 0;
  let totalRefundedAmount = 0;
  let processingDaysTotal = 0;
  let processingCount = 0;

  for (const order of orders) {
    if (!isPrepaidPayment(order.payment_method)) continue;
    if (order.status !== "cancelled") continue;
    if (!wasOrderPaidBeforeRefund(order.payment_status)) continue;

    totalRefundRequests++;

    if (order.payment_status === "refund_pending") refundPending++;
    if (order.payment_status === "refunded") {
      refundCompleted++;
      totalRefundedAmount += refundAmountForOrder(order);
      if (order.refund_initiated_at && order.refund_date) {
        processingDaysTotal += businessDaysBetween(order.refund_initiated_at, order.refund_date);
        processingCount++;
      }
    }
  }

  return {
    totalRefundRequests,
    refundPending,
    refundCompleted,
    totalRefundedAmount,
    averageProcessingDays:
      processingCount > 0 ? Math.round(processingDaysTotal / processingCount) : null
  };
}

export function formatRefundDateTime(iso: string | undefined | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

export function sanitizeRefundState(order: Order): Order {
  if (isCodPayment(order.payment_method)) {
    if (order.payment_status === "refunded" || order.payment_status === "refund_pending") {
      return { ...order, payment_status: "pending" };
    }
    return order;
  }

  if (order.payment_status === "refunded") {
    if (!order.refund_date || refundAmountForOrder(order) <= 0) {
      return { ...order, payment_status: "refund_pending" };
    }
  }

  return order;
}

export function formatRefundDate(iso: string | undefined | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}
