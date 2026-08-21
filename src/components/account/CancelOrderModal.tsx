"use client";

import { useEffect, useState } from "react";
import type { CustomerRefundDetailsInput } from "@/lib/orders/manual-refund";
import { isPrepaidPayment } from "@/lib/orders/payment-rules";

export type CancelOrderSubmitPayload = CustomerRefundDetailsInput & {
  cancellation_reason?: string;
};

type CancelOrderModalProps = {
  open: boolean;
  orderNumber: string;
  isPrepaid: boolean;
  loading?: boolean;
  onConfirm: (payload: CancelOrderSubmitPayload) => void;
  onCancel: () => void;
};

export function CancelOrderModal({
  open,
  orderNumber,
  isPrepaid,
  loading = false,
  onConfirm,
  onCancel
}: CancelOrderModalProps) {
  const [cancellationReason, setCancellationReason] = useState("");

  useEffect(() => {
    if (!open) return;
    setCancellationReason("");
  }, [open]);

  if (!open) return null;

  const handleSubmit = () => {
    onConfirm({
      cancellation_reason: cancellationReason.trim() || undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-order-title"
      >
        <h2 id="cancel-order-title" className="font-bold text-primary">
          Cancel Order
        </h2>
        <p className="mt-2 text-sm text-foreground/70">
          Are you sure you want to cancel this order?
        </p>
        <p className="mt-2 text-xs text-foreground/50">Order {orderNumber}</p>

        <label className="mt-4 block text-sm">
          <span className="text-foreground/70">Cancellation Reason (optional)</span>
          <textarea
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            rows={2}
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            placeholder="Tell us why you are cancelling"
          />
        </label>

        {isPrepaid ? (
          <div className="mt-4 space-y-2 border-t border-accent/10 pt-4">
            <p className="text-sm font-medium text-foreground">Refund Method</p>
            <p className="text-sm font-semibold text-primary">Original Payment Method</p>
            <p className="text-xs text-foreground/60">
              Your refund will be processed to the original payment method used for this order.
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-foreground/70">
            Your order will be cancelled. No payment was collected for this COD order.
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="flex-1 rounded-lg border px-4 py-2 text-sm"
            disabled={loading}
            onClick={onCancel}
          >
            Keep Order
          </button>
          <button
            type="button"
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? "Submitting…" : "Confirm Cancellation"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function orderIsPrepaidForCancel(paymentMethod: string | undefined): boolean {
  return isPrepaidPayment(paymentMethod);
}
