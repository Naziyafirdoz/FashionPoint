import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveOrderEtaZone } from "@/lib/orders/delivery-dates";
import { resolveShippingZone } from "@/lib/shipping/city-detection";
import type { Order } from "@/types";

export type OrderFulfillmentZone = NonNullable<Order["fulfillment_zone"]>;

function legacyFulfillmentZone(address: Order["shipping_address"]): OrderFulfillmentZone {
  if (!address) return "outstation";
  const zone = resolveShippingZone(address);
  return zone === "outskirts" ? "outstation" : zone;
}

/**
 * Same local/outstation resolution the order GET API attaches as fulfillment_zone.
 * Does not change branch assignment or shipping amounts.
 */
export async function attachOrderFulfillmentZone(
  db: SupabaseClient,
  order: Order
): Promise<Order> {
  try {
    const zone = await resolveOrderEtaZone(order, db);
    return {
      ...order,
      fulfillment_zone: zone === "outskirts" ? "outstation" : zone
    };
  } catch (error) {
    console.error("[orders] fulfillment zone error:", error);
    return { ...order, fulfillment_zone: legacyFulfillmentZone(order.shipping_address) };
  }
}
