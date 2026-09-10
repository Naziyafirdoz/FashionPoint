import type { Order } from "@/types";
import type { FulfillmentZone } from "@/lib/orders/fulfillment-zone";
import { normalizeLegacyStatus } from "@/lib/orders/status-config";

export type FulfillmentMethod = "rapido" | "dtdc" | "delivery_boy";

export const FULFILLMENT_METHODS: FulfillmentMethod[] = ["rapido", "dtdc", "delivery_boy"];

/** Shared API error when post-shipment mutation is rejected. */
export const SHIPMENT_LOCKED_ERROR =
  "Order shipment details are locked because the order has already been shipped.";

export function isFulfillmentMethod(value: unknown): value is FulfillmentMethod {
  return value === "rapido" || value === "dtdc" || value === "delivery_boy";
}

/**
 * Local (active branch service-area PIN) → Rapido + Delivery Boy.
 * Outstation → DTDC only.
 */
export function allowedFulfillmentMethodsForZone(
  zone: FulfillmentZone
): Array<"rapido" | "dtdc" | "delivery_boy"> {
  if (zone === "local") return ["rapido", "delivery_boy"];
  return ["dtdc"];
}

export function courierLabelForMethod(method: FulfillmentMethod): string {
  switch (method) {
    case "rapido":
      return "Rapido";
    case "dtdc":
      return "DTDC";
    case "delivery_boy":
      return "Delivery Staff";
  }
}

/** Post-shipment statuses where method/tracking/Rapido details must not change. */
export function isShipmentStatusLocked(status: string): boolean {
  const normalized = normalizeLegacyStatus(status);
  return (
    normalized === "shipped" ||
    normalized === "out_for_delivery" ||
    normalized === "delivered"
  );
}

/**
 * Lock derived from order status only (after successful mark-shipped / OFD / delivered).
 * Selecting Rapido or saving Rapido details while ready_to_ship does NOT lock.
 */
export function methodLocked(order: Pick<Order, "status" | "fulfillment_method">): boolean {
  return isShipmentStatusLocked(String(order.status ?? ""));
}

/**
 * Server-side eligibility: method must match zone from active branch service areas.
 */
export async function assertFulfillmentMethodAllowed(
  order: Pick<
    Order,
    "shipping_address" | "fulfillment_zone" | "branch_id" | "fulfillment_method" | "status"
  >,
  method: FulfillmentMethod
): Promise<{ ok: true; zone: FulfillmentZone } | { ok: false; error: string }> {
  if (!isFulfillmentMethod(method)) {
    return { ok: false, error: "Invalid fulfillment method." };
  }

  if (methodLocked(order) && order.fulfillment_method && order.fulfillment_method !== method) {
    return { ok: false, error: "Fulfillment method cannot be changed after shipping has started." };
  }

  const { resolveFulfillmentZoneForOrder } = await import("@/lib/orders/fulfillment-zone");
  const { zone } = await resolveFulfillmentZoneForOrder(order);
  const allowed = allowedFulfillmentMethodsForZone(zone);

  if (!allowed.includes(method)) {
    return {
      ok: false,
      error:
        zone === "local"
          ? "Local orders can only use Rapido or Delivery Staff."
          : "Outstation orders can only use DTDC."
    };
  }

  return { ok: true, zone };
}
