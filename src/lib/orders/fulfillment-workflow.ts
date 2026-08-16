import { getStageLabel, normalizeLegacyStatus, orderStatusLabel } from "@/lib/orders/status-config";
import type { Order, OrderStatus } from "@/types";

/** Internal statuses hidden from customers. */
export const INTERNAL_FULFILLMENT_STATUSES: OrderStatus[] = [
  "packing_assigned",
  "packed"
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

/** Customer-facing label — same source as admin (`order.status` via STATUS_CONFIG). */
export function getCustomerFacingStatusLabel(
  order: Pick<Order, "status" | "payment_status" | "refund_status" | "payment_method">
): string {
  return getStageLabel(order);
}

export function getAdminFulfillmentStatusLabel(status: string): string {
  const normalized = normalizeLegacyStatus(status);
  switch (normalized) {
    case "confirmed":
      return "Confirmed";
    case "packing_assigned":
      return "Packing Assigned";
    case "packed":
      return "Packed";
    case "ready_to_ship":
      return "Ready For Shipping";
    case "shipped":
      return "Shipped";
    default:
      return orderStatusLabel(normalized);
  }
}

type FulfillmentZoneOrder = Pick<Order, "fulfillment_zone">;

/** Persisted Local vs Standard. Missing/null zone is Standard. */
function isLocalFulfillmentOrder(order: FulfillmentZoneOrder): boolean {
  return order.fulfillment_zone === "local";
}

export function customerConfirmedMessage(order: FulfillmentZoneOrder): string {
  const lines = [
    "Your order has been confirmed.",
    "Fashion Point is preparing your parcel."
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

export function customerShippedMessage(order: FulfillmentZoneOrder): string {
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
