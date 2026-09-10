import { getStageLabel, normalizeLegacyStatus, orderStatusLabel } from "@/lib/orders/status-config";
import { STORE_NAME } from "@/lib/site-config";
import type { Order, OrderStatus } from "@/types";

/** Internal statuses — use customer-facing labels instead of raw enum names. */
export const INTERNAL_FULFILLMENT_STATUSES: OrderStatus[] = [
  "packing_assigned",
  "packed",
  "ready_to_ship"
];

export const ADMIN_FULFILLMENT_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "packing_assigned",
  "packed",
  "ready_to_ship",
  "shipped",
  "out_for_delivery",
  "delivered"
];

/** Statuses awaiting admin order approval. */
export function isAwaitingOrderApproval(status: string): boolean {
  const s = normalizeLegacyStatus(status);
  return s === "pending" || s === "processing";
}

/**
 * Single status label for all order surfaces (admin + customer).
 * Delegates to STATUS_CONFIG via getStageLabel — no alternate wording.
 */
export function getCustomerFacingStatusLabel(
  order: Pick<Order, "status" | "payment_status" | "refund_status" | "payment_method">
): string {
  return getStageLabel(order);
}

export function getAdminFulfillmentStatusLabel(status: string): string {
  return orderStatusLabel(normalizeLegacyStatus(status));
}

type FulfillmentZoneOrder = Pick<Order, "fulfillment_zone">;

/** Persisted Local vs Standard. Missing/null zone is Standard. */
function isLocalFulfillmentOrder(order: FulfillmentZoneOrder): boolean {
  return order.fulfillment_zone === "local";
}

export function customerConfirmedMessage(order: FulfillmentZoneOrder, storeName: string = STORE_NAME): string {
  const brand = storeName.trim() || STORE_NAME;
  const lines = [
    "Your order has been confirmed.",
    `${brand} is preparing your parcel.`
  ];
  if (isLocalFulfillmentOrder(order)) {
    lines.push("Expected delivery within 2 days.");
  } else {
    lines.push(
      "Your order will be shipped through DTDC.",
      "Delivery timeline depends on the courier partner."
    );
  }
  return lines.join("\n");
}

export function customerShippedMessage(
  order: Pick<Order, "fulfillment_zone" | "fulfillment_method">
): string {
  if (order.fulfillment_method === "rapido") {
    return "Your order has been shipped with Rapido.\nExpected delivery within 2 days.";
  }
  if (order.fulfillment_method === "dtdc") {
    return "Your order has been shipped through DTDC.\nUse the tracking number in your order email to follow the shipment.";
  }
  if (isLocalFulfillmentOrder(order)) {
    return "Your order has been shipped.\nExpected delivery within 2 days.";
  }
  return "Your order has been shipped through DTDC.\nTracking details will be shared when available.";
}

export function workerReminderIntervalHours(order: FulfillmentZoneOrder): number {
  return isLocalFulfillmentOrder(order) ? 1 : 2;
}

export function formatShippingAddress(order: Order): string {
  const a = order.shipping_address;
  if (!a) return "—";
  const parts = [
    a.name,
    a.phone,
    a.house_flat || a.address_line1,
    a.street || a.address_line2,
    a.landmark,
    [a.city, a.state, a.pincode || a.postal_code].filter(Boolean).join(", ")
  ].filter(Boolean);
  return parts.join("\n");
}
