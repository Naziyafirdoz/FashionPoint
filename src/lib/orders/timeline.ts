import type { Order, ReturnRequest } from "@/types";
import type { OrderTimelineEntry } from "@/lib/orders/refunds";
import { isPrepaidPayment } from "@/lib/orders/payment-rules";
import { wasOrderPaidBeforeRefund } from "@/lib/orders/refunds";
import { resolveOrderCourierName } from "@/lib/orders/rapido-delivery-metadata";
import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import { STORE_NAME } from "@/lib/site-config";

export type FulfillmentMilestoneStep = {
  label: string;
  completed: boolean;
  at?: string;
  notes?: string;
};

const FULFILLMENT_RANK: Record<string, number> = {
  pending: 0,
  processing: 1,
  confirmed: 2,
  packing_assigned: 2,
  packed: 2,
  ready_to_ship: 3,
  shipped: 4,
  out_for_delivery: 4,
  delivered: 5
};

function statusRank(status: string): number {
  return FULFILLMENT_RANK[normalizeLegacyStatus(status)] ?? -1;
}

function isDeliveryBoyPath(order: Order): boolean {
  if (order.fulfillment_method === "delivery_boy") return true;
  if (order.assigned_delivery_worker_id) return true;
  const status = normalizeLegacyStatus(order.status);
  return status === "out_for_delivery";
}

/** All fulfillment milestones with completion derived from order status. */
export function buildFulfillmentMilestoneSteps(
  order: Order,
  storeName: string = STORE_NAME
): FulfillmentMilestoneStep[] {
  const status = normalizeLegacyStatus(order.status);
  const rank = statusRank(status);
  const payment = (order.payment_status ?? "").toLowerCase();
  const prepaid = isPrepaidPayment(order.payment_method);
  const paid = prepaid && wasOrderPaidBeforeRefund(payment);
  const deliveryBoy = isDeliveryBoyPath(order);

  const steps: FulfillmentMilestoneStep[] = [
    {
      label: "Order Placed",
      completed: true,
      at: order.created_at,
      notes: "Customer placed the order"
    }
  ];

  if (prepaid) {
    steps.push({
      label: "Payment Received",
      completed: paid,
      at: paid ? order.created_at : undefined,
      notes: paid ? "Online payment confirmed" : undefined
    });
  }

  steps.push({
    label: "Confirmed",
    completed: rank >= 2,
    at: rank >= 2 ? (order.confirmed_at ?? order.approved_at ?? order.updated_at ?? order.created_at) : undefined,
    notes: rank >= 2 ? "Order approved by staff" : undefined
  });

  steps.push({
    label: "Ready for Shipping",
    completed: rank >= 3,
    at: rank >= 3 ? (order.updated_at ?? order.created_at) : undefined,
    notes: rank >= 3 ? "Ready for dispatch" : undefined
  });

  if (deliveryBoy) {
    steps.push({
      label: "Out for Delivery",
      completed: status === "out_for_delivery" || status === "delivered",
      at:
        status === "out_for_delivery" || status === "delivered"
          ? (order.updated_at ?? order.created_at)
          : undefined,
      notes:
        status === "out_for_delivery" || status === "delivered"
          ? "Assigned to delivery staff"
          : undefined
    });
  } else {
    steps.push({
      label: "Shipped",
      completed: status === "shipped" || status === "delivered",
      at:
        status === "shipped" || status === "delivered"
          ? (order.shipping_date ?? order.updated_at ?? order.created_at)
          : undefined,
      notes:
        status === "shipped" || status === "delivered"
          ? `Handed to courier. ${storeName} responsibility is complete.`
          : undefined
    });
  }

  steps.push({
    label: "Delivered",
    completed: status === "delivered",
    at:
      status === "delivered"
        ? (order.delivery_confirmed_at ?? order.otp_verified_at ?? order.updated_at ?? order.created_at)
        : undefined,
    notes: status === "delivered" ? "Delivery completed" : undefined
  });

  return steps;
}

/** Admin order detail — completed milestones only. */
export function buildFulfillmentMilestoneTimeline(
  order: Order,
  storeName: string = STORE_NAME
): OrderTimelineEntry[] {
  return buildFulfillmentMilestoneSteps(order, storeName)
    .filter((step) => step.completed && step.at)
    .map((step) => ({
      label: step.label,
      at: step.at!,
      notes: step.notes
    }));
}

const RETURN_TIMELINE: Partial<Record<string, string>> = {
  return_requested: "Return Requested",
  return_approved: "Return Approved",
  pickup_scheduled: "Pickup Scheduled",
  picked_up: "Picked Up",
  returned: "Returned",
  refund_pending: "Refund Initiated",
  refunded: "Refund Completed"
};

export { generateDeliveryOtp } from "@/lib/orders/workflow";
export { orderStatusLabel } from "@/lib/orders/status-config";

type TimelineOptions = {
  includeRefundEvents?: boolean;
  storeName?: string;
};

function pushEntry(
  entries: OrderTimelineEntry[],
  label: string,
  at?: string | null,
  notes?: string
) {
  if (!at) return;
  entries.push({ label, at, notes });
}

export function buildFullOrderTimeline(
  order: Order,
  returnRequest?: ReturnRequest | null,
  options?: TimelineOptions
): OrderTimelineEntry[] {
  const includeRefundEvents = options?.includeRefundEvents !== false;
  const storeName = options?.storeName ?? STORE_NAME;
  const entries: OrderTimelineEntry[] = [];
  const payment = (order.payment_status ?? "").toLowerCase();
  const prepaid = isPrepaidPayment(order.payment_method);
  const status = normalizeLegacyStatus(order.status);
  const rank = statusRank(status);
  const deliveryBoy = isDeliveryBoyPath(order);

  pushEntry(entries, "Order Placed", order.created_at, "Customer placed the order");

  if (prepaid && wasOrderPaidBeforeRefund(payment)) {
    pushEntry(entries, "Payment Received", order.created_at, "Online payment confirmed");
  }

  if (rank >= 2) {
    pushEntry(
      entries,
      "Confirmed",
      order.confirmed_at ?? order.approved_at ?? order.updated_at ?? order.created_at,
      "Order approved by staff"
    );
  }

  // Legacy packing only — show when packing actually happened; never invent on normal path.
  if (order.packed_at || status === "packing_assigned" || status === "packed") {
    pushEntry(
      entries,
      "Order Packed",
      order.packed_at ?? order.assigned_at ?? order.updated_at,
      "Items packed (legacy packing workflow)"
    );
  }

  if (rank >= 3) {
    pushEntry(
      entries,
      "Ready for Shipping",
      order.updated_at ?? order.created_at,
      "Ready for dispatch"
    );
  }

  if (deliveryBoy) {
    if (status === "out_for_delivery" || status === "delivered") {
      pushEntry(
        entries,
        "Out for Delivery",
        order.updated_at,
        "Assigned to delivery staff"
      );
    }
  } else if (status === "shipped" || status === "delivered" || order.shipping_date) {
    const courier = resolveOrderCourierName(order);
    const awb = order.tracking_number ?? order.tracking_id;
    const shipNotes = [courier ? `Courier: ${courier}` : null, awb ? `AWB: ${awb}` : null]
      .filter(Boolean)
      .join(" · ");
    pushEntry(
      entries,
      "Shipped",
      order.shipping_date ?? order.updated_at,
      shipNotes || `Handed to courier. ${storeName} responsibility is complete.`
    );
  }

  if (order.delivery_confirmed_at || order.otp_verified_at || status === "delivered") {
    pushEntry(
      entries,
      "Delivered",
      order.delivery_confirmed_at ?? order.otp_verified_at ?? order.updated_at,
      "Delivery confirmed"
    );
  }

  if (status === "cancelled") {
    pushEntry(
      entries,
      "Order Cancelled",
      order.refund_initiated_at ?? order.updated_at ?? order.created_at,
      order.notes?.trim() || "Order was cancelled"
    );
  }

  if (returnRequest) {
    const flow = [
      "return_requested",
      "return_approved",
      "pickup_scheduled",
      "picked_up",
      "returned",
      "refund_pending",
      "refunded"
    ] as const;
    const idx = flow.indexOf(returnRequest.status as (typeof flow)[number]);
    for (let i = 0; i <= idx; i++) {
      const key = flow[i];
      const label = RETURN_TIMELINE[key];
      if (label) {
        pushEntry(
          entries,
          label,
          i === 0 ? returnRequest.created_at : returnRequest.updated_at ?? returnRequest.created_at,
          returnRequest.notes?.trim()
        );
      }
    }
  }

  if (includeRefundEvents && (payment === "refund_pending" || order.refund_initiated_at)) {
    pushEntry(
      entries,
      "Refund Initiated",
      order.refund_initiated_at ?? order.updated_at,
      order.refund_notes?.trim() || "Refund processing started"
    );
  }

  if (includeRefundEvents && payment === "refunded" && order.refund_date) {
    pushEntry(
      entries,
      "Refund Completed",
      order.refund_date,
      order.refund_reference?.trim()
        ? `Reference: ${order.refund_reference.trim()}`
        : "Refund credited to customer"
    );
  }

  return entries.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}
