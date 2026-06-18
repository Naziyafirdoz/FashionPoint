"use client";

import {
  customerRefundStatusLabel,
  formatCancelledDate,
  resolveCancelledAt
} from "@/lib/orders/cancellation";
import {
  customerCancelRequestMessage,
  isCancelRequestedOrder,
  isCancellationApprovedOrder,
  refundMethodLabel
} from "@/lib/orders/manual-refund";
import type { Order } from "@/types";

type CustomerCancelledOrderSectionProps = {
  order: Order;
};

export function CustomerCancelledOrderSection({ order }: CustomerCancelledOrderSectionProps) {
  if (isCancelRequestedOrder(order)) {
    return (
      <section className="mt-3 rounded-xl border border-orange-200 bg-orange-50/60 p-4">
        <p className="text-sm font-semibold text-orange-900">Cancel Requested</p>
        <p className="mt-1 text-sm text-foreground/70">{customerCancelRequestMessage()}</p>
        <dl className="mt-3 space-y-1.5 border-t border-orange-100 pt-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-foreground/60">Refund Status</dt>
            <dd className="font-medium">{customerRefundStatusLabel(order)}</dd>
          </div>
          {order.refund_method ? (
            <div className="flex justify-between gap-4">
              <dt className="text-foreground/60">Refund Method</dt>
              <dd>{refundMethodLabel(order.refund_method)}</dd>
            </div>
          ) : null}
        </dl>
      </section>
    );
  }

  if (isCancellationApprovedOrder(order)) {
    return (
      <section className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
        <p className="text-sm font-semibold text-amber-900">Cancellation Approved</p>
        <p className="mt-1 text-sm text-foreground/70">
          Your cancellation was approved. We are processing your refund manually and will complete it
          shortly.
        </p>
        <dl className="mt-3 space-y-1.5 border-t border-amber-100 pt-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-foreground/60">Refund Status</dt>
            <dd className="font-medium">{customerRefundStatusLabel(order)}</dd>
          </div>
        </dl>
      </section>
    );
  }

  if (order.status !== "cancelled") return null;

  const cancelledAt = resolveCancelledAt(order);
  const showRefundDetails =
    (order.payment_status ?? "").toLowerCase() === "refund_pending" ||
    (order.payment_status ?? "").toLowerCase() === "refunded" ||
    Boolean(order.refund_method);

  return (
    <section className="mt-3 rounded-xl border border-red-200 bg-red-50/60 p-4">
      <p className="text-sm font-semibold text-red-800">Cancelled</p>
      <p className="mt-1 text-sm text-foreground/70">Order cancelled on {formatCancelledDate(cancelledAt)}</p>

      {showRefundDetails ? (
        <dl className="mt-3 space-y-1.5 border-t border-red-100 pt-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-foreground/60">Refund Status</dt>
            <dd className="font-medium">{customerRefundStatusLabel(order)}</dd>
          </div>
          {order.refund_method ? (
            <div className="flex justify-between gap-4">
              <dt className="text-foreground/60">Refund Method</dt>
              <dd className="text-right">{refundMethodLabel(order.refund_method)}</dd>
            </div>
          ) : (
            <div className="flex justify-between gap-4">
              <dt className="text-foreground/60">Refund Method</dt>
              <dd className="text-right">Original Payment Method</dd>
            </div>
          )}
          {(order.payment_status ?? "").toLowerCase() !== "refunded" ? (
            <div className="flex justify-between gap-4">
              <dt className="text-foreground/60">Estimated Refund Time</dt>
              <dd className="text-right">Approximately 5 Business Days</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </section>
  );
}
