import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import { isVijayawadaShippingPincode } from "@/lib/shipping/vijayawada-pincodes";
import type { Order } from "@/types";

export const CUSTOMER_VIJAYAWADA_DELIVERY_ESTIMATE = "Approximately 2 Days";

export const CUSTOMER_ORDER_STATUS_MESSAGE =
  "We'll update your order status as it progresses.";

type CustomerDeliveryOrder = Pick<Order, "status" | "shipping_address" | "fulfillment_zone">;

function isLocalDeliveryEstimate(order: CustomerDeliveryOrder): boolean {
  if (order.fulfillment_zone === "local") return true;
  if (order.fulfillment_zone === "outstation") return false;
  return Boolean(
    order.shipping_address && isVijayawadaShippingPincode(order.shipping_address.pincode)
  );
}

/** Local assigned-branch (or legacy Vijayawada PIN) active orders only. */
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

  if (isLocalDeliveryEstimate(order)) {
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
