import type { Order, OrderStatus, ReturnRequest } from "@/types";
import type { OrderTimelineEntry } from "@/lib/orders/refunds";
import { isPrepaidPayment } from "@/lib/orders/payment-rules";
import { wasOrderPaidBeforeRefund } from "@/lib/orders/refunds";
import { normalizeLegacyStatus } from "@/lib/orders/status-config";

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
  packing_assigned: 3,
  packed: 3,
  ready_to_ship: 4,
  shipped: 5,
  out_for_delivery: 5,
  delivered: 6
};

function statusRank(status: string): number {
  return FULFILLMENT_RANK[normalizeLegacyStatus(status)] ?? -1;
}

/** All fulfillment milestones with completion derived from order status. */
export function buildFulfillmentMilestoneSteps(order: Order): FulfillmentMilestoneStep[] {
  const status = normalizeLegacyStatus(order.status);
  const rank = statusRank(status);
  const payment = (order.payment_status ?? "").toLowerCase();
  const prepaid = isPrepaidPayment(order.payment_method);
  const paid = prepaid && wasOrderPaidBeforeRefund(payment);

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

  steps.push(
    {
      label: "Order Confirmed",
      completed: rank >= 2,
      at: rank >= 2 ? (order.confirmed_at ?? order.updated_at ?? order.created_at) : undefined,
      notes: rank >= 2 ? "Order approved by staff" : undefined
    },
    {
      label: "Packing Started",
      completed: rank >= 3,
      at:
        rank >= 3
          ? (order.assigned_at ?? order.packed_at ?? order.updated_at ?? order.created_at)
          : undefined,
      notes: rank >= 3 ? "Packing in progress" : undefined
    },
    {
      label: "Ready For Shipping",
      completed: rank >= 4,
      at: rank >= 4 ? (order.updated_at ?? order.created_at) : undefined,
      notes: rank >= 4 ? "Ready for dispatch" : undefined
    },
    {
      label: "Shipped",
      completed: rank >= 5,
      at:
        rank >= 5
          ? (order.shipping_date ?? order.updated_at ?? order.created_at)
          : undefined,
      notes: rank >= 5 ? "Order shipped" : undefined
    },
    {
      label: "Delivered",
      completed: rank >= 6,
      at:
        rank >= 6
          ? (order.delivery_confirmed_at ?? order.otp_verified_at ?? order.updated_at ?? order.created_at)
          : undefined,
      notes: rank >= 6 ? "Delivery completed" : undefined
    }
  );

  return steps;
}

/** Admin order detail — completed milestones only. */
export function buildFulfillmentMilestoneTimeline(order: Order): OrderTimelineEntry[] {
  return buildFulfillmentMilestoneSteps(order)
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
  const entries: OrderTimelineEntry[] = [];
  const payment = (order.payment_status ?? "").toLowerCase();
  const prepaid = isPrepaidPayment(order.payment_method);
  const status = normalizeLegacyStatus(order.status);

  pushEntry(entries, "Order Placed", order.created_at, "Customer placed the order");

  if (prepaid && wasOrderPaidBeforeRefund(payment)) {
    pushEntry(entries, "Payment Received", order.created_at, "Online payment confirmed");
  }

  const pastProcessing: OrderStatus[] = [
    "processing",
    "ready_to_ship",
    "out_for_delivery",
    "delivered",
    "returned"
  ];
  if (pastProcessing.includes(status)) {
    pushEntry(
      entries,
      "Processing",
      order.updated_at ?? order.created_at,
      "Order is being prepared"
    );
  }

  if (order.packed_at || ["ready_to_ship", "out_for_delivery", "delivered", "returned"].includes(status)) {
    pushEntry(
      entries,
      "Order Packed",
      order.packed_at ?? order.updated_at,
      "Items packed and ready for dispatch"
    );
  }

  if (order.shipping_date || ["out_for_delivery", "delivered"].includes(status)) {
    const courier = order.courier_partner ?? order.courier_name;
    const awb = order.tracking_number ?? order.tracking_id;
    const shipNotes = [courier ? `Courier: ${courier}` : null, awb ? `AWB: ${awb}` : null]
      .filter(Boolean)
      .join(" · ");
    pushEntry(
      entries,
      "Order Shipped",
      order.shipping_date ?? order.updated_at,
      shipNotes || "Shipment dispatched"
    );
  }

  if (status === "out_for_delivery" || (status === "delivered" && order.otp_verified_at)) {
    pushEntry(
      entries,
      "Out For Delivery",
      order.updated_at,
      "Package is with the delivery agent"
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
