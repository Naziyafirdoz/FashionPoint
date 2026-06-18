import { formatDeliveryDate } from "@/lib/orders/delivery-dates";
import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import { isVijayawadaDelivery } from "@/lib/shipping/city-detection";
import type { Order } from "@/types";

export const VIJAYAWADA_ESTIMATED_DELIVERY_LABEL = "Approximately 2 Days";

export type AdminDeliveryDisplay =
  | { kind: "hidden" }
  | { kind: "vijayawada_estimate"; label: string }
  | { kind: "delivered"; deliveredAt: string | null };

type AdminDeliveryOrder = Pick<
  Order,
  "status" | "shipping_address" | "delivery_confirmed_at" | "otp_verified_at"
>;

/** Admin-only delivery estimate rules (no calendar dates, no DTDC estimates). */
export function resolveAdminDeliveryDisplay(order: AdminDeliveryOrder): AdminDeliveryDisplay {
  const status = normalizeLegacyStatus(order.status);

  if (status === "cancelled" || status === "returned") {
    return { kind: "hidden" };
  }

  if (status === "delivered") {
    return {
      kind: "delivered",
      deliveredAt: order.delivery_confirmed_at ?? order.otp_verified_at ?? null
    };
  }

  if (order.shipping_address && isVijayawadaDelivery(order.shipping_address)) {
    return { kind: "vijayawada_estimate", label: VIJAYAWADA_ESTIMATED_DELIVERY_LABEL };
  }

  return { kind: "hidden" };
}

export function formatAdminDeliveredText(display: Extract<AdminDeliveryDisplay, { kind: "delivered" }>): string {
  if (display.deliveredAt) {
    return `Delivered on ${formatDeliveryDate(display.deliveredAt)}`;
  }
  return "Delivered";
}
