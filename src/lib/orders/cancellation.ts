import { isPrepaidPayment } from "@/lib/orders/payment-rules";
import {
  FULFILLMENT_BASE_CLEAR_COLUMN_NAMES,
  FULFILLMENT_MIGRATION_COLUMN_NAMES
} from "@/lib/orders/cancellation-schema";
import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import type { Order } from "@/types";

export type RefundStatus = "initiated" | "completed";

type CancellationRefundOrder = {
  status: string;
  refund_status?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
};

const DISPATCHED_DELIVERY_STATUSES = new Set([
  "out_for_delivery",
  "shipped",
  "in_transit",
  "delivered"
]);

export function orderHasTrackingAssigned(
  order: Pick<Order, "tracking_number" | "tracking_id">
): boolean {
  return Boolean(order.tracking_number?.trim() || order.tracking_id?.trim());
}

export function orderHasShipmentDispatched(
  order: Pick<Order, "shipment_id" | "delivery_status" | "status">
): boolean {
  if (order.shipment_id?.trim()) return true;
  const deliveryStatus = (order.delivery_status ?? "").toLowerCase();
  if (deliveryStatus && DISPATCHED_DELIVERY_STATUSES.has(deliveryStatus)) return true;
  const status = normalizeLegacyStatus(order.status);
  return status === "out_for_delivery" || status === "delivered" || (order.status as string) === "shipped";
}

/** Customer may cancel only while processing, before shipment is dispatched.
 * Inventory note: stock was already deducted at payment finalize; cancel does not restore stock. */
export function isOrderEligibleForCustomerCancellation(
  order: Pick<
    Order,
    "status" | "tracking_number" | "tracking_id" | "shipment_id" | "delivery_status"
  >
): boolean {
  const status = normalizeLegacyStatus(order.status);
  if (
    status === "cancelled" ||
    status === "returned" ||
    (order.status as string) === "cancel_requested" ||
    (order.status as string) === "cancellation_approved"
  ) {
    return false;
  }
  if (status !== "processing") return false;

  // Mock shipment rows are created at payment (status "booked") before admin fulfillment.
  // Block cancellation only once delivery has actually left the store pipeline.
  const deliveryStatus = (order.delivery_status ?? "").toLowerCase();
  if (deliveryStatus && DISPATCHED_DELIVERY_STATUSES.has(deliveryStatus)) {
    return false;
  }

  return true;
}

export function resolveCancelledAt(order: Pick<Order, "cancelled_at" | "updated_at" | "created_at">): string {
  return order.cancelled_at ?? order.updated_at ?? order.created_at;
}

export function formatCancelledDateTime(iso: string | undefined | null): string {
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

export function formatCancelledDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export function resolveOrderRefundStatus(
  order: Pick<Order, "refund_status" | "payment_status">
): RefundStatus | null {
  if (order.refund_status === "initiated" || order.refund_status === "completed") {
    return order.refund_status;
  }
  const payment = (order.payment_status ?? "").toLowerCase();
  if (payment === "refund_pending") return "initiated";
  if (payment === "refunded") return "completed";
  return null;
}

export function customerRefundStatusLabel(
  order: Pick<Order, "refund_status" | "payment_status" | "status">
): string {
  const manual = (order.refund_status ?? "").toLowerCase();
  if (manual === "refund_details_submitted") return "Refund Details Submitted";
  if (manual === "refund_pending") return "Refund Pending";
  if (manual === "refunded") return "Refunded";
  const status = resolveOrderRefundStatus(order);
  if (status === "completed") return "Completed";
  if (status === "initiated") return "Initiated";
  return "—";
}

export function shouldShowCancelledRefundDetails(
  order: Pick<Order, "status" | "payment_method" | "payment_status">
): boolean {
  if (normalizeLegacyStatus(order.status) !== "cancelled") return false;
  if (!isPrepaidPayment(order.payment_method)) return false;
  const payment = (order.payment_status ?? "").toLowerCase();
  return payment === "paid" || payment === "refund_pending" || payment === "refunded";
}

export const CUSTOMER_REFUND_ESTIMATE_MESSAGE =
  "Refund will be processed to your original payment method. Estimated refund time: approximately 5 business days.";

export const CUSTOMER_CANCELLED_ONLINE_PAYMENT_MESSAGE =
  "If payment was made online, the refund will be processed to the original payment method within approximately 5 business days.";

export function buildCancellationFulfillmentClearPayload(
  availableColumns: Set<string>
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const clearable = [
    ...FULFILLMENT_BASE_CLEAR_COLUMN_NAMES,
    "tracking_number",
    ...FULFILLMENT_MIGRATION_COLUMN_NAMES
  ] as const;

  for (const column of clearable) {
    if (availableColumns.has(column)) {
      payload[column] = null;
    }
  }

  return payload;
}

export function isCancelledRefunded(order: CancellationRefundOrder): boolean {
  const refundStatus = (order.refund_status ?? "").toLowerCase();
  if (refundStatus === "completed" || refundStatus === "refunded") {
    if (normalizeLegacyStatus(order.status) === "cancelled") return true;
  }
  if (normalizeLegacyStatus(order.status) !== "cancelled") return false;
  if (order.refund_status === "completed") return true;
  return (
    isPrepaidPayment(order.payment_method ?? undefined) &&
    (order.payment_status ?? "").toLowerCase() === "refunded"
  );
}

/** Cancelled prepaid orders still awaiting admin refund processing. */
export function isCancelledAwaitingRefund(order: CancellationRefundOrder): boolean {
  if (normalizeLegacyStatus(order.status) !== "cancelled") return false;
  if (isCancelledRefunded(order)) return false;

  const refundStatus = (order.refund_status ?? "").toLowerCase();
  if (
    refundStatus === "initiated" ||
    refundStatus === "pending" ||
    refundStatus === "refund_details_submitted" ||
    refundStatus === "refund_pending"
  ) {
    return true;
  }

  if ((order.status as string) === "cancel_requested") return true;
  if ((order.status as string) === "cancellation_approved") return true;

  return (
    isPrepaidPayment(order.payment_method ?? undefined) &&
    (order.payment_status ?? "").toLowerCase() === "refund_pending"
  );
}

export function requiresCustomerCancellationRefund(order: CancellationRefundOrder): boolean {
  return isCancelledAwaitingRefund(order);
}

export function isCustomerCancelledOrder(order: Pick<Order, "status"> | { status: string }): boolean {
  return normalizeLegacyStatus(order.status) === "cancelled";
}

export const ADMIN_ESTIMATED_REFUND_TIME_LABEL = "5 Business Days";

export function buildCancellationMetadataPayload(input: {
  cancellationReason?: string;
  order: Pick<Order, "payment_method" | "payment_status">;
  includeCancellationColumns: boolean;
  availableFulfillmentColumns: Set<string>;
}): Record<string, unknown> {
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = buildCancellationFulfillmentClearPayload(
    input.availableFulfillmentColumns
  );

  if (!input.includeCancellationColumns) {
    return payload;
  }

  payload.cancelled_at = now;

  const reason = input.cancellationReason?.trim();
  if (reason) {
    payload.cancellation_reason = reason;
  }

  if (
    isPrepaidPayment(input.order.payment_method) &&
    (input.order.payment_status ?? "").toLowerCase() === "paid"
  ) {
    payload.refund_status = "initiated";
  }

  return payload;
}
