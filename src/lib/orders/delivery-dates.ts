import type { Order } from "@/types";
import { resolveShippingZone } from "@/lib/shipping/city-detection";
import { estimateDeliveryWindow } from "@/lib/shipping/rates";

function addBusinessDays(start: Date, businessDays: number): Date {
  const result = new Date(start);
  let added = 0;
  while (added < businessDays) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

export function computeEstimatedDeliveryDate(orderDate: Date = new Date(), zone?: "local" | "outstation"): string {
  const window = estimateDeliveryWindow(zone ?? "outstation");
  return addBusinessDays(orderDate, window.maxDays).toISOString().slice(0, 10);
}

export function resolveExpectedDeliveryDate(order: Order): string | null {
  if (order.estimated_delivery_date) {
    return order.estimated_delivery_date;
  }
  if (order.preferred_delivery_date) {
    return order.preferred_delivery_date;
  }

  const zone = order.shipping_address
    ? resolveShippingZone(order.shipping_address)
    : "outstation";

  const etaZone = zone === "outskirts" ? "outstation" : (zone as "local" | "outstation");
  return computeEstimatedDeliveryDate(new Date(order.created_at), etaZone);
}

export function formatDeliveryDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}
