import { getDeliveryProvider } from "@/lib/delivery";
import type { DeliveryAddress, DeliveryStatus } from "@/lib/delivery/types";
import { getShippingSettings } from "@/lib/shipping/settings";
import { estimateDeliveryWindow } from "@/lib/shipping/rates";
import { resolveOrderEtaZone } from "@/lib/orders/delivery-dates";
import { resolveOrderBranch } from "@/lib/shipping/order-branch";
import type { Order } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

function addBusinessDays(start: Date, days: number): string {
  const result = new Date(start);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result.toISOString().slice(0, 10);
}

function orderAddressToDelivery(order: Order): DeliveryAddress | null {
  const addr = order.shipping_address;
  if (!addr) return null;

  const line = addr.line ?? [addr.line1, addr.line2].filter(Boolean).join(", ");
  if (!line?.trim()) return null;

  return {
    name: addr.name ?? "Customer",
    phone: addr.phone ?? "",
    line: line.trim(),
    city: addr.city ?? "",
    state: addr.state ?? "",
    pincode: addr.pincode ?? addr.postal_code ?? ""
  };
}

export async function computeEstimatedDeliveryDateForOrder(
  order: Order,
  db?: SupabaseClient | null
): Promise<string | null> {
  const addr = order.shipping_address;
  if (!addr) return null;
  const zone = await resolveOrderEtaZone(order, db);
  const eta = estimateDeliveryWindow(zone);
  return addBusinessDays(new Date(order.created_at), eta.maxDays);
}

export type ShipmentCreateOutcome = {
  ok: boolean;
  shipmentId?: string;
  trackingNumber?: string;
  deliveryPartner?: string;
  deliveryStatus?: DeliveryStatus;
  estimatedDeliveryDate?: string;
  error?: string;
};

export async function createShipmentForOrder(
  db: SupabaseClient,
  order: Order
): Promise<ShipmentCreateOutcome> {
  const delivery = orderAddressToDelivery(order);
  if (!delivery) {
    return { ok: false, error: "Missing delivery address" };
  }

  const settings = getShippingSettings();
  const provider = getDeliveryProvider();
  const { pickup } = await resolveOrderBranch(order, db);

  try {
    const result = await provider.createShipment({
      orderId: order.id,
      orderNumber: order.order_number,
      pickup,
      delivery,
      package: {
        weightKg: settings.defaultPackageWeightKg,
        notes: `Order ${order.order_number}`
      },
      shippingAmount: Number(order.shipping_amount ?? 0)
    });

    const updatePayload: Record<string, unknown> = {
      shipment_id: result.shipmentId,
      tracking_number: result.trackingNumber,
      tracking_id: result.trackingNumber,
      courier_partner: result.provider,
      courier_name: result.provider,
      delivery_status: result.status,
      delivery_partner: result.provider
    };

    const { error } = await db.from("orders").update(updatePayload).eq("id", order.id);

    if (error) {
      const minimalPayload = {
        tracking_number: result.trackingNumber,
        tracking_id: result.trackingNumber,
        courier_partner: result.provider,
        courier_name: result.provider
      };
      const retry = await db.from("orders").update(minimalPayload).eq("id", order.id);
      if (retry.error) {
        return { ok: false, error: retry.error.message };
      }
    }

    return {
      ok: true,
      shipmentId: result.shipmentId,
      trackingNumber: result.trackingNumber,
      deliveryPartner: result.provider,
      deliveryStatus: result.status
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Shipment creation failed";
    return { ok: false, error: message };
  }
}

export async function dispatchShipmentForOrder(
  db: SupabaseClient,
  order: Order
): Promise<ShipmentCreateOutcome> {
  if (order.shipment_id && order.tracking_number) {
    const { error } = await db
      .from("orders")
      .update({
        delivery_status: "out_for_delivery",
        status: "out_for_delivery"
      })
      .eq("id", order.id);

    if (error) {
      return { ok: false, error: error.message };
    }

    return {
      ok: true,
      shipmentId: order.shipment_id,
      trackingNumber: order.tracking_number,
      deliveryPartner: order.delivery_partner ?? order.courier_partner ?? undefined,
      deliveryStatus: "out_for_delivery"
    };
  }

  const created = await createShipmentForOrder(db, order);
  if (!created.ok) return created;

  await db
    .from("orders")
    .update({ delivery_status: "out_for_delivery", status: "out_for_delivery" })
    .eq("id", order.id);

  return { ...created, deliveryStatus: "out_for_delivery" };
}
