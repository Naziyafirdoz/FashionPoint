"use client";

import Image from "next/image";
import { useState } from "react";
import toast from "react-hot-toast";
import {
  customerName,
  customerPhone,
  formatCurrency,
  paymentMethodLabel
} from "@/lib/orders/admin-orders";
import { getStageLabel } from "@/lib/orders/admin-order-ui";
import { requiresCustomerCancellationRefund } from "@/lib/orders/cancellation";
import {
  canAdminApproveCancellation,
  canAdminMarkManualRefundCompleted,
  canAdminRejectCancellation,
  isCancelRequestedOrder,
  isManualRefundOrder,
  MANUAL_REFUND_STATUS,
  manualOrderStatusLabel,
  paidAmountForOrder,
  refundMethodLabel
} from "@/lib/orders/manual-refund";
import { formatRefundDateTime, refundAmountForOrder } from "@/lib/orders/refunds";
import type { Order } from "@/types";

type RefundInformationSectionProps = {
  order: Order;
  onApproveCancellation?: () => void;
  onRejectCancellation?: () => void;
  onMarkRefundCompleted?: () => void;
  onProcessRefund?: () => void;
  processingAction?: boolean;
};

async function copyText(text: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch {
    toast.error("Could not copy to clipboard");
  }
}

function isRefundCompleted(order: Order): boolean {
  const refundStatus = (order.refund_status ?? "").toLowerCase();
  return refundStatus === MANUAL_REFUND_STATUS.REFUNDED || order.payment_status === "refunded";
}

function orderStatusLabel(order: Order): string {
  const status = order.status as string;
  if (status === "cancel_requested" || status === "cancellation_approved") {
    return manualOrderStatusLabel(status);
  }
  return getStageLabel(order);
}

export function RefundInformationSection({
  order,
  onApproveCancellation,
  onRejectCancellation,
  onMarkRefundCompleted,
  onProcessRefund,
  processingAction = false
}: RefundInformationSectionProps) {
  const [showQrModal, setShowQrModal] = useState(false);
  const amountToRefund = refundAmountForOrder(order);
  const paidAmount = paidAmountForOrder(order);
  const showApproveReject = isCancelRequestedOrder(order);
  const canComplete = canAdminMarkManualRefundCompleted(order);
  const refunded = isRefundCompleted(order);
  const isLegacyRefund =
    !isManualRefundOrder(order) && requiresCustomerCancellationRefund(order);
  const method = (order.refund_method ?? "").toLowerCase();
  const hasRefundDetails = Boolean(order.refund_method);

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-5">
      <h2 className="font-semibold text-primary">Cancellation &amp; Refund</h2>

      <div className="mt-4 rounded-lg border border-amber-100 bg-white/80 p-4">
        <h3 className="text-sm font-semibold text-amber-950">Order Information</h3>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-foreground/60">Order ID</dt>
            <dd className="font-medium">{order.order_number}</dd>
          </div>
          <div>
            <dt className="text-foreground/60">Customer Name</dt>
            <dd className="font-medium">{customerName(order)}</dd>
          </div>
          <div>
            <dt className="text-foreground/60">Phone Number</dt>
            <dd>{customerPhone(order)}</dd>
          </div>
          <div>
            <dt className="text-foreground/60">Amount Paid</dt>
            <dd className="font-semibold tabular-nums">{formatCurrency(paidAmount)}</dd>
          </div>
          <div>
            <dt className="text-foreground/60">Payment Method</dt>
            <dd>{paymentMethodLabel(order.payment_method)}</dd>
          </div>
          <div>
            <dt className="text-foreground/60">Order Status</dt>
            <dd className="font-medium">{orderStatusLabel(order)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 rounded-lg border border-amber-300 bg-amber-100/60 px-4 py-3">
        <dt className="text-xs font-medium text-amber-900">Amount To Refund</dt>
        <dd className="mt-1 text-2xl font-bold tabular-nums text-amber-950">
          {formatCurrency(amountToRefund)}
        </dd>
      </div>

      {hasRefundDetails ? (
        <div className="mt-4 rounded-lg border border-amber-100 bg-white/80 p-4">
          <h3 className="text-sm font-semibold text-amber-950">Customer Refund Details</h3>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="text-foreground/60">Refund Method</dt>
              <dd className="font-medium">{refundMethodLabel(order.refund_method)}</dd>
            </div>

            {method === "original_payment_method" || method === "razorpay" || order.razorpay_refund_id ? (
              <div className="space-y-2 rounded-lg border px-3 py-2">
                <div className="flex justify-between gap-4">
                  <dt className="text-foreground/50">Payment</dt>
                  <dd className="text-right font-medium">Razorpay</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-foreground/50">Refund</dt>
                  <dd className="text-right font-medium">Automatic via Razorpay</dd>
                </div>
                {order.razorpay_refund_id ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-foreground/50">Razorpay Refund ID</dt>
                    <dd className="font-mono text-right text-xs">{order.razorpay_refund_id}</dd>
                  </div>
                ) : (
                  <p className="text-xs text-foreground/60">
                    Refund to original payment method after you approve this cancellation.
                  </p>
                )}
              </div>
            ) : null}

            {method === "upi" && order.refund_upi_id ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
                <div>
                  <p className="text-xs text-foreground/50">UPI ID</p>
                  <p className="font-mono text-sm">{order.refund_upi_id}</p>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:bg-gray-50"
                  onClick={() => void copyText(order.refund_upi_id!, "UPI ID copied")}
                >
                  Copy UPI ID
                </button>
              </div>
            ) : null}

            {method === "bank_account" && order.refund_bank_account_number ? (
              <dl className="space-y-2 rounded-lg border px-3 py-2">
                <div className="flex justify-between gap-4">
                  <dt className="text-foreground/50">Account Holder</dt>
                  <dd className="text-right font-medium">{order.refund_bank_holder_name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-foreground/50">Account Number</dt>
                  <dd className="font-mono text-right">{order.refund_bank_account_number}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-foreground/50">IFSC</dt>
                  <dd className="font-mono text-right">{order.refund_bank_ifsc}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-foreground/50">Bank Name</dt>
                  <dd className="text-right font-medium">{order.refund_bank_name}</dd>
                </div>
              </dl>
            ) : null}

            {method === "qr_code" && order.refund_qr_image_url ? (
              <div className="space-y-3">
                <div className="relative h-52 w-52 overflow-hidden rounded-lg border bg-white">
                  <Image
                    src={order.refund_qr_image_url}
                    alt="Customer refund QR code"
                    fill
                    className="object-contain"
                  />
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:bg-gray-50"
                  onClick={() => setShowQrModal(true)}
                >
                  View QR Image
                </button>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}

      {showApproveReject ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {canAdminApproveCancellation(order) && onApproveCancellation ? (
            <button
              type="button"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              disabled={processingAction}
              onClick={onApproveCancellation}
            >
              Approve Cancellation
            </button>
          ) : null}
          {canAdminRejectCancellation(order) && onRejectCancellation ? (
            <button
              type="button"
              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-60"
              disabled={processingAction}
              onClick={onRejectCancellation}
            >
              Reject Cancellation
            </button>
          ) : null}
        </div>
      ) : null}

      {canComplete && onMarkRefundCompleted ? (
        <button
          type="button"
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          disabled={processingAction}
          onClick={onMarkRefundCompleted}
        >
          Mark Refund Completed
        </button>
      ) : null}

      {refunded ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
          <h3 className="text-sm font-semibold text-emerald-950">Refund Record</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-foreground/60">Refund Status</dt>
              <dd className="font-medium text-emerald-800">Refunded</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-foreground/60">Refund Amount</dt>
              <dd className="font-semibold tabular-nums">{formatCurrency(amountToRefund)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-foreground/60">Refunded On</dt>
              <dd>{formatRefundDateTime(order.refund_date ?? order.refund_completed_at)}</dd>
            </div>
            {order.razorpay_refund_id?.trim() ? (
              <div className="flex justify-between gap-4">
                <dt className="text-foreground/60">Razorpay Refund ID</dt>
                <dd className="font-mono text-sm">{order.razorpay_refund_id.trim()}</dd>
              </div>
            ) : null}
            {order.refund_reference?.trim() ? (
              <div className="flex justify-between gap-4">
                <dt className="text-foreground/60">UTR Number</dt>
                <dd className="font-mono text-sm">{order.refund_reference.trim()}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-foreground/60">Refunded By</dt>
              <dd>Admin</dd>
            </div>
          </dl>
        </div>
      ) : null}

      {isLegacyRefund && onProcessRefund ? (
        <button
          type="button"
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          disabled={processingAction}
          onClick={onProcessRefund}
        >
          {processingAction ? "Processing…" : "Process Refund"}
        </button>
      ) : null}

      {showQrModal && order.refund_qr_image_url ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Customer QR code"
        >
          <div className="relative max-h-[90vh] max-w-lg rounded-xl bg-white p-4">
            <button
              type="button"
              className="absolute right-3 top-3 rounded-lg border px-2 py-1 text-xs"
              onClick={() => setShowQrModal(false)}
            >
              Close
            </button>
            <div className="relative mt-6 h-[70vh] w-[70vw] max-h-[32rem] max-w-[32rem]">
              <Image
                src={order.refund_qr_image_url}
                alt="Customer refund QR code full size"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
