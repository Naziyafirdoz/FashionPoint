import type { Order } from "@/types";
import { isOrderEligibleForCustomerCancellation } from "@/lib/orders/cancellation";
import { isCodPayment, isPrepaidPayment } from "@/lib/orders/payment-rules";
import { wasOrderPaidBeforeRefund } from "@/lib/orders/refunds";
import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import {
  CUSTOMER_ORDER_CANCELLATION_ENABLED,
  RETURNS_EXCHANGES_REFUNDS_DISABLED
} from "@/lib/store-policy";
import type { ReturnRequest } from "@/types";

export const RETURN_WINDOW_DAYS = 7;

export function canCustomerCancelOrder(
  order: Pick<
    Order,
    "status" | "tracking_number" | "tracking_id" | "shipment_id" | "delivery_status"
  >
): boolean {
  if (!CUSTOMER_ORDER_CANCELLATION_ENABLED) return false;
  return isOrderEligibleForCustomerCancellation(order);
}

export function customerCancelBlockedReason(
  order: Pick<
    Order,
    "status" | "tracking_number" | "tracking_id" | "shipment_id" | "delivery_status"
  >
): string | null {
  if (normalizeLegacyStatus(order.status) === "cancelled") {
    return "This order is already cancelled.";
  }
  if ((order.status as string) === "cancel_requested") {
    return "A cancellation request is already pending for this order.";
  }
  if ((order.status as string) === "cancellation_approved") {
    return "This order cancellation has been approved and is being processed.";
  }
  if (
    (order.status as string) === "shipped" ||
    order.status === "out_for_delivery" ||
    order.status === "delivered"
  ) {
    return "Orders cannot be cancelled after shipment.";
  }
  if (order.status === "returned") return "This order has already been returned.";
  if (!canCustomerCancelOrder(order)) {
    return "This order cannot be cancelled at this stage.";
  }
  return null;
}

export function prepaidCancelRefundMessage(): string {
  return "Order cancelled successfully. Refund will be processed to your original payment method within approximately 5 business days.";
}

export function codCancelMessage(): string {
  return "Your order has been cancelled successfully.";
}

export function cancelSuccessMessage(order: Order): string {
  if (isCodPayment(order.payment_method)) return codCancelMessage();
  if (
    isPrepaidPayment(order.payment_method) &&
    (order.payment_status === "refund_pending" || wasOrderPaidBeforeRefund(order.payment_status))
  ) {
    return prepaidCancelRefundMessage();
  }
  return "Your order has been cancelled.";
}

export function getDeliveryTimestamp(order: Order): string {
  return order.delivery_confirmed_at ?? order.updated_at ?? order.created_at;
}

export function isWithinReturnWindow(order: Order, windowDays = RETURN_WINDOW_DAYS): boolean {
  if (order.status !== "delivered") return false;
  const deliveredAt = new Date(getDeliveryTimestamp(order));
  const deadline = new Date(deliveredAt);
  deadline.setDate(deadline.getDate() + windowDays);
  return Date.now() <= deadline.getTime();
}

export function returnDaysRemaining(order: Order): number | null {
  if (order.status !== "delivered") return null;
  const deliveredAt = new Date(getDeliveryTimestamp(order));
  const deadline = new Date(deliveredAt);
  deadline.setDate(deadline.getDate() + RETURN_WINDOW_DAYS);
  const ms = deadline.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function canRequestReturn(
  order: Order,
  existingReturn: ReturnRequest | null | undefined
): boolean {
  if (RETURNS_EXCHANGES_REFUNDS_DISABLED) return false;
  if (order.status !== "delivered") return false;
  if (existingReturn) return false;
  return isWithinReturnWindow(order);
}

export function returnRequestBlockedReason(
  order: Order,
  existingReturn: ReturnRequest | null | undefined
): string | null {
  if (RETURNS_EXCHANGES_REFUNDS_DISABLED) {
    return "Returns are not available for this store.";
  }
  if (existingReturn) return "A return request has already been submitted for this order.";
  if (order.status !== "delivered") return "Returns are only available for delivered orders.";
  if (!isWithinReturnWindow(order)) {
    return `Return window has closed (${RETURN_WINDOW_DAYS} days from delivery).`;
  }
  return null;
}

export function returnWindowDeadline(order: Order): Date | null {
  if (order.status !== "delivered") return null;
  const deliveredAt = new Date(getDeliveryTimestamp(order));
  const deadline = new Date(deliveredAt);
  deadline.setDate(deadline.getDate() + RETURN_WINDOW_DAYS);
  return deadline;
}

export function formatReturnWindowDeadline(order: Order): string | null {
  const deadline = returnWindowDeadline(order);
  if (!deadline) return null;
  return deadline.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export function shouldShowCustomerReturnRefundSection(
  order: Order,
  returnRequest: ReturnRequest | null | undefined
): boolean {
  if (RETURNS_EXCHANGES_REFUNDS_DISABLED) {
    if (returnRequest) return false;
    return false;
  }
  if (returnRequest) return true;
  return (
    order.status === "cancelled" &&
    isPrepaidPayment(order.payment_method) &&
    wasOrderPaidBeforeRefund(order.payment_status)
  );
}
