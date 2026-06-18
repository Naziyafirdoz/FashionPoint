"use client";

import {
  PAYMENT_STATUS_COLORS,
  paymentStatusLabel
} from "@/lib/orders/admin-orders";
import { shouldShowCustomerReturnRefundSection } from "@/lib/orders/customer-orders";
import {
  REFUND_SLA_HELPER,
  REFUND_SLA_LABEL,
  formatRefundDate,
  formatRefundDateTime,
  refundAmountForOrder,
  resolveExpectedRefundDate
} from "@/lib/orders/refunds";
import { returnReasonLabel, returnStatusLabel } from "@/lib/orders/returns";
import type { Order, ReturnRequest } from "@/types";

type CustomerReturnRefundSectionProps = {
  order: Order;
  returnRequest?: ReturnRequest | null;
};

export function CustomerReturnRefundSection({
  order,
  returnRequest
}: CustomerReturnRefundSectionProps) {
  if (!shouldShowCustomerReturnRefundSection(order, returnRequest)) {
    return null;
  }

  const showOrderRefund =
    order.status === "cancelled" &&
    (order.payment_status === "refund_pending" || order.payment_status === "refunded");
  const showReturnRefund =
    returnRequest &&
    (returnRequest.status === "refund_pending" || returnRequest.status === "refunded");
  const refundPending =
    order.payment_status === "refund_pending" ||
    returnRequest?.status === "refund_pending";
  const expectedBy = resolveExpectedRefundDate(order);

  return (
    <section className="mt-4 rounded-xl border border-accent/20 bg-blush/20 p-4">
      <h3 className="font-semibold text-primary">Return &amp; Refund</h3>

      {returnRequest ? (
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-foreground/60">Return Status</dt>
            <dd className="font-medium">{returnStatusLabel(returnRequest.status)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-foreground/60">Return Reason</dt>
            <dd>{returnReasonLabel(returnRequest.reason)}</dd>
          </div>
          {returnRequest.notes?.trim() ? (
            <div className="flex justify-between gap-4">
              <dt className="text-foreground/60">Notes</dt>
              <dd className="text-right">{returnRequest.notes}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {(showOrderRefund || showReturnRefund || refundPending) && (
        <dl className="mt-3 space-y-2 border-t border-accent/10 pt-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-foreground/60">Refund Amount</dt>
            <dd>₹{refundAmountForOrder(order).toLocaleString("en-IN")}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-foreground/60">Refund Status</dt>
            <dd>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  PAYMENT_STATUS_COLORS[order.payment_status] ?? "bg-gray-100"
                }`}
              >
                {paymentStatusLabel(
                  returnRequest?.status === "refunded"
                    ? "refunded"
                    : returnRequest?.status === "refund_pending"
                      ? "refund_pending"
                      : order.payment_status
                )}
              </span>
            </dd>
          </div>
          {order.refund_date ? (
            <div className="flex justify-between gap-4">
              <dt className="text-foreground/60">Refund Date</dt>
              <dd>{formatRefundDateTime(order.refund_date)}</dd>
            </div>
          ) : null}
          {order.refund_reference?.trim() ? (
            <div className="flex justify-between gap-4">
              <dt className="text-foreground/60">Refund Reference</dt>
              <dd>{order.refund_reference}</dd>
            </div>
          ) : null}
          {refundPending && expectedBy ? (
            <div className="flex justify-between gap-4">
              <dt className="text-foreground/60">Expected Refund Date</dt>
              <dd>{formatRefundDate(expectedBy)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-foreground/60">Processing Time</dt>
            <dd>{REFUND_SLA_LABEL}</dd>
          </div>
        </dl>
      )}

      <p className="mt-3 rounded-lg bg-white/60 px-3 py-2 text-xs text-foreground/70">
        {REFUND_SLA_HELPER}
      </p>
    </section>
  );
}
