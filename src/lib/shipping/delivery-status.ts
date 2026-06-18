import type { DeliveryStatus } from "@/lib/delivery/types";
import { DELIVERY_STATUS_LABELS } from "@/lib/delivery/types";

export function deliveryStatusLabel(status: string | null | undefined): string {
  if (!status) return "Pending";
  const key = status as DeliveryStatus;
  return DELIVERY_STATUS_LABELS[key] ?? status.replace(/_/g, " ");
}

export function mapOrderStatusToDeliveryHint(status: string): string {
  if (status === "out_for_delivery") return "Out For Delivery";
  if (status === "delivered") return "Delivered";
  if (status === "ready_to_ship") return "Booked";
  if (status === "processing") return "Pending";
  return "Pending";
}
