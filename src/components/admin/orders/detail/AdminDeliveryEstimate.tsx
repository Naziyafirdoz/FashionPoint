"use client";

import {
  formatAdminDeliveredText,
  resolveAdminDeliveryDisplay
} from "@/lib/orders/admin-delivery-display";
import type { Order } from "@/types";

type AdminDeliveryEstimateProps = {
  order: Pick<Order, "status" | "shipping_address" | "delivery_confirmed_at" | "otp_verified_at">;
  className?: string;
};

/** Renders admin delivery estimate / delivered status below delivery address. */
export function AdminDeliveryEstimate({ order, className = "mt-2 text-xs text-gray-500" }: AdminDeliveryEstimateProps) {
  const display = resolveAdminDeliveryDisplay(order);

  if (display.kind === "hidden") {
    return null;
  }

  if (display.kind === "vijayawada_estimate") {
    return (
      <p className={className}>
        Estimated Delivery:{" "}
        <span className="font-medium text-gray-800">{display.label}</span>
      </p>
    );
  }

  return (
    <p className={className}>
      <span className="font-medium text-gray-800">{formatAdminDeliveredText(display)}</span>
    </p>
  );
}
