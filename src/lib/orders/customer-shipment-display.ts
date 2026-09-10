import { resolveOrderCourierName } from "@/lib/orders/rapido-delivery-metadata";
import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import type { Order } from "@/types";

export type CustomerShipmentSummary = {
  courier: string;
  trackingNumber: string | null;
  /** FROM: Admin Store Information storeName + address exactly (no reconstruction). */
  fromAddressLines: string[];
  toAddressLines: string[];
};

/** Must come from store_settings key=store_information value.{storeName,address} only. */
export type StoreInformationShipmentSource = {
  storeName: string;
  address: string;
};

function toAddressLines(order: Pick<Order, "shipping_address">): string[] {
  const a = order.shipping_address;
  if (!a) return [];
  return [
    a.name || a.full_name,
    a.phone || a.mobile,
    a.house_flat || a.address_line1 || a.line1,
    a.street || a.address_line2 || a.line2,
    a.landmark,
    [a.city, a.state].filter(Boolean).join(", "),
    a.pincode || a.postal_code
  ]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);
}

/**
 * FROM lines from Admin Settings → Store Information only.
 * No branch data, no customer data, no hardcoded defaults, no city/state inference.
 */
export function formatStoreInformationFromAddressLines(
  store: StoreInformationShipmentSource
): string[] {
  const lines: string[] = [];
  const name = typeof store.storeName === "string" ? store.storeName.trim() : "";
  const address = typeof store.address === "string" ? store.address.trim() : "";
  if (name) lines.push(name);
  if (address) lines.push(address);
  return lines;
}

/** Customer-visible shipment details after the order has left the store. */
export function getCustomerShipmentSummary(
  order: Pick<
    Order,
    | "status"
    | "shipping_address"
    | "tracking_number"
    | "tracking_id"
    | "courier_name"
    | "courier_partner"
    | "delivery_partner"
    | "fulfillment_method"
  >,
  store: StoreInformationShipmentSource
): CustomerShipmentSummary | null {
  const status = normalizeLegacyStatus(order.status);
  if (status !== "shipped" && status !== "out_for_delivery" && status !== "delivered") {
    return null;
  }

  // Delivery Boy is internal staff — never show a courier tracking/AWB to the customer.
  if (order.fulfillment_method === "delivery_boy") {
    return {
      courier: resolveOrderCourierName(order),
      trackingNumber: null,
      fromAddressLines: formatStoreInformationFromAddressLines(store),
      toAddressLines: toAddressLines(order)
    };
  }

  return {
    courier: resolveOrderCourierName(order),
    trackingNumber: order.tracking_number?.trim() || order.tracking_id?.trim() || null,
    fromAddressLines: formatStoreInformationFromAddressLines(store),
    toAddressLines: toAddressLines(order)
  };
}
