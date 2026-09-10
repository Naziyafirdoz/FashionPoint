import type { Order } from "@/types";

export const FULFILLMENT_META_KEY = "fulfillment_meta";

export const DEFAULT_COURIER_NAME = "Rapido Parcel";

const PLACEHOLDER_COURIER_PATTERN = /mock\s*courier/i;

export type RapidoDeliveryDetails = {
  courier_name?: string;
  rider_name?: string;
  rider_phone?: string;
  vehicle_number?: string;
  pickup_time?: string;
  notes?: string;
};

type FulfillmentMeta = {
  rapido_delivery?: RapidoDeliveryDetails;
};

function readFulfillmentMeta(
  address?: Record<string, unknown> | null
): FulfillmentMeta | null {
  if (!address) return null;
  const raw = address[FULFILLMENT_META_KEY];
  if (!raw || typeof raw !== "object") return null;
  return raw as FulfillmentMeta;
}

export function getRapidoDeliveryDetails(
  order: Pick<Order, "shipping_address">
): RapidoDeliveryDetails | null {
  const meta = readFulfillmentMeta(order.shipping_address as Record<string, unknown> | undefined);
  return meta?.rapido_delivery ?? null;
}

export function isPlaceholderCourierName(name?: string | null): boolean {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return true;
  return PLACEHOLDER_COURIER_PATTERN.test(trimmed);
}

/** Courier label for emails, admin UI, and tracking. */
export function resolveOrderCourierName(
  order: Pick<
    Order,
    "shipping_address" | "courier_name" | "courier_partner" | "delivery_partner" | "fulfillment_method"
  >
): string {
  // Persisted fulfillment method is authoritative for shipped method choice.
  if (order.fulfillment_method === "dtdc") {
    return "DTDC";
  }
  if (order.fulfillment_method === "delivery_boy") {
    return "Delivery Staff";
  }

  // Prefer top-level shipment columns written by mark-shipped / assign-delivery.
  for (const candidate of [
    order.courier_name,
    order.courier_partner,
    order.delivery_partner
  ]) {
    const trimmed = candidate?.trim();
    if (trimmed && !isPlaceholderCourierName(trimmed)) {
      return trimmed;
    }
  }

  // Rapido rider form meta only for Rapido (or legacy rows with no method set).
  // Never use leftover Rapido meta to override a DTDC/Delivery Boy shipment.
  if (order.fulfillment_method === "rapido" || order.fulfillment_method == null) {
    const rapido = getRapidoDeliveryDetails(order);
    if (rapido?.courier_name?.trim()) {
      return rapido.courier_name.trim();
    }
  }

  if (order.fulfillment_method === "rapido") {
    return DEFAULT_COURIER_NAME;
  }

  return DEFAULT_COURIER_NAME;
}

export function buildShippingAddressWithRapidoDetails(
  existing: Record<string, unknown> | null | undefined,
  details: RapidoDeliveryDetails
): Record<string, unknown> {
  const base = { ...(existing ?? {}) };
  const priorMeta = readFulfillmentMeta(base) ?? {};
  base[FULFILLMENT_META_KEY] = {
    ...priorMeta,
    rapido_delivery: {
      ...priorMeta.rapido_delivery,
      ...details
    }
  };
  return base;
}

export function formatPickupTimeDisplay(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}
