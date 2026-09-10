import type { OrderStatus } from "@/types";
import {
  isCancelledAwaitingRefund,
  isCancelledRefunded
} from "@/lib/orders/cancellation";

/** Canonical order statuses shown in admin UI. */
export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "packing_assigned",
  "packed",
  "ready_to_ship",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancel_requested",
  "cancellation_approved",
  "cancelled",
  "returned"
];

export const PAYMENT_FILTER_STATUSES = ["refund_pending", "refunded"] as const;

export type StatusDisplayKey =
  | OrderStatus
  | "refund_pending"
  | "refunded"
  | "cancelled_awaiting_refund"
  | "cancelled_refunded";

type StatusConfig = {
  label: string;
  /** Tailwind classes for bordered pill badges */
  pill: string;
  /** Tailwind classes for flat badges (customer account) */
  flat: string;
};

export const STATUS_CONFIG: Record<StatusDisplayKey, StatusConfig> = {
  pending: {
    label: "Pending",
    pill: "bg-gray-50 text-gray-800 border-gray-200",
    flat: "bg-gray-100 text-gray-800"
  },
  confirmed: {
    label: "Confirmed",
    pill: "bg-emerald-100 text-emerald-700 border-emerald-200",
    flat: "bg-emerald-100 text-emerald-700"
  },
  processing: {
    label: "Processing",
    pill: "bg-amber-100 text-amber-700 border-amber-200",
    flat: "bg-amber-100 text-amber-700"
  },
  packing_assigned: {
    label: "Packing",
    pill: "bg-blue-100 text-blue-700 border-blue-200",
    flat: "bg-blue-100 text-blue-700"
  },
  packed: {
    label: "Packed",
    pill: "bg-blue-100 text-blue-700 border-blue-200",
    flat: "bg-blue-100 text-blue-700"
  },
  ready_to_ship: {
    label: "Ready for Shipping",
    pill: "bg-[#F0E7FF] text-[#6D28D9] border-[#D8B4FE] font-semibold",
    flat: "bg-purple-100 text-purple-700 font-semibold"
  },
  shipped: {
    label: "Shipped",
    pill: "bg-indigo-100 text-indigo-700 border-indigo-200",
    flat: "bg-indigo-100 text-indigo-700"
  },
  out_for_delivery: {
    label: "Out for Delivery",
    pill: "bg-indigo-100 text-indigo-700 border-indigo-200",
    flat: "bg-indigo-100 text-indigo-700"
  },
  delivered: {
    label: "Delivered",
    pill: "bg-green-100 text-green-700 border-green-200",
    flat: "bg-green-100 text-green-700"
  },
  cancel_requested: {
    label: "Cancellation Requested",
    pill: "bg-orange-50 text-orange-900 border-orange-200 font-semibold",
    flat: "bg-orange-100 text-orange-900 font-semibold"
  },
  cancellation_approved: {
    label: "Cancellation Approved",
    pill: "bg-amber-50 text-amber-900 border-amber-200 font-semibold",
    flat: "bg-amber-100 text-amber-900 font-semibold"
  },
  cancelled: {
    label: "Cancelled",
    pill: "bg-red-50 text-red-800 border-red-200",
    flat: "bg-red-100 text-red-700 font-semibold"
  },
  cancelled_awaiting_refund: {
    label: "Cancelled - Awaiting Refund",
    pill: "bg-amber-50 text-amber-900 border-amber-200 font-semibold",
    flat: "bg-amber-100 text-amber-900 font-semibold"
  },
  cancelled_refunded: {
    label: "Cancelled - Refunded",
    pill: "bg-slate-50 text-slate-800 border-slate-200",
    flat: "bg-slate-100 text-slate-800"
  },
  returned: {
    label: "Returned",
    pill: "bg-orange-50 text-orange-800 border-orange-200",
    flat: "bg-orange-100 text-orange-800"
  },
  refund_pending: {
    label: "Refund Pending",
    pill: "bg-yellow-50 text-yellow-900 border-yellow-200",
    flat: "bg-yellow-100 text-yellow-900"
  },
  refunded: {
    label: "Refunded",
    pill: "bg-slate-50 text-slate-800 border-slate-200",
    flat: "bg-slate-100 text-slate-800"
  }
};

const LEGACY_STATUS_MAP: Record<string, OrderStatus> = {
  cod_verification: "processing"
};

/** Map legacy DB values to current workflow statuses. */
export function normalizeLegacyStatus(status: string): OrderStatus {
  return (LEGACY_STATUS_MAP[status] ?? status) as OrderStatus;
}

export function orderStatusLabel(status: OrderStatus | string): string {
  const normalized = normalizeLegacyStatus(status);
  return STATUS_CONFIG[normalized as StatusDisplayKey]?.label ?? String(status);
}

export function getStatusPillClass(order: {
  status: string;
  payment_status?: string;
  refund_status?: string;
  payment_method?: string;
}): string {
  if (isCancelledRefunded(order)) return STATUS_CONFIG.cancelled_refunded.pill;
  if (isCancelledAwaitingRefund(order)) return STATUS_CONFIG.cancelled_awaiting_refund.pill;
  const payment = (order.payment_status ?? "").toLowerCase();
  if (payment === "refund_pending") return STATUS_CONFIG.refund_pending.pill;
  if (payment === "refunded") return STATUS_CONFIG.refunded.pill;
  const normalized = normalizeLegacyStatus(order.status);
  return STATUS_CONFIG[normalized as StatusDisplayKey]?.pill ?? STATUS_CONFIG.pending.pill;
}

export function getStatusFlatClass(order: {
  status: string;
  payment_status?: string;
  refund_status?: string;
  payment_method?: string;
}): string {
  if (isCancelledRefunded(order)) return STATUS_CONFIG.cancelled_refunded.flat;
  if (isCancelledAwaitingRefund(order)) return STATUS_CONFIG.cancelled_awaiting_refund.flat;
  const payment = (order.payment_status ?? "").toLowerCase();
  if (payment === "refund_pending") return STATUS_CONFIG.refund_pending.flat;
  if (payment === "refunded") return STATUS_CONFIG.refunded.flat;
  const normalized = normalizeLegacyStatus(order.status);
  return STATUS_CONFIG[normalized as StatusDisplayKey]?.flat ?? STATUS_CONFIG.pending.flat;
}

export function getStageLabel(order: {
  status: string;
  payment_status?: string;
  refund_status?: string;
  payment_method?: string;
}): string {
  if (isCancelledRefunded(order)) return STATUS_CONFIG.cancelled_refunded.label;
  if (isCancelledAwaitingRefund(order)) return STATUS_CONFIG.cancelled_awaiting_refund.label;
  const payment = (order.payment_status ?? "").toLowerCase();
  if (payment === "refund_pending") return STATUS_CONFIG.refund_pending.label;
  if (payment === "refunded") return STATUS_CONFIG.refunded.label;
  return orderStatusLabel(order.status);
}
