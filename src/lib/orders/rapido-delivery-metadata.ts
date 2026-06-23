import type { Order } from "@/types";

export const FULFILLMENT_META_KEY = "fulfillment_meta";

export type RapidoDeliveryDetails = {
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
