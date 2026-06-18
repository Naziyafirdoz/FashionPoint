import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import { isVijayawadaDelivery } from "@/lib/shipping/city-detection";
import type { Order } from "@/types";

export const CUSTOMER_VIJAYAWADA_DELIVERY_ESTIMATE = "Approximately 2 Days";

export const CUSTOMER_ORDER_STATUS_MESSAGE =
  "We'll update your order status as it progresses.";

type CustomerDeliveryOrder = Pick<Order, "status" | "shipping_address">;

/** Vijayawada active orders only — no estimates for cancelled, delivered, or DTDC orders. */
export function resolveCustomerDeliveryEstimate(order: CustomerDeliveryOrder): string | null {
  const status = normalizeLegacyStatus(order.status);

  if (
    status === "cancelled" ||
    status === "delivered" ||
    status === "returned" ||
    (order.status as string) === "cancel_requested" ||
    (order.status as string) === "cancellation_approved"
  ) {
    return null;
  }

  if (order.shipping_address && isVijayawadaDelivery(order.shipping_address)) {
    return CUSTOMER_VIJAYAWADA_DELIVERY_ESTIMATE;
  }

  return null;
}

export function shouldShowCustomerOrderStatusMessage(order: CustomerDeliveryOrder): boolean {
  const status = normalizeLegacyStatus(order.status);
  return (
    status !== "cancelled" &&
    status !== "delivered" &&
    status !== "returned" &&
    (order.status as string) !== "cancel_requested" &&
    (order.status as string) !== "cancellation_approved"
  );
}
