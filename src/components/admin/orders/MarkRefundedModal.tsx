"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/orders/admin-orders";

type MarkRefundedModalProps = {
  open: boolean;
  orderNumber: string;
  refundAmount: number;
  suggestedReference?: string;
  onConfirm: (payload: { refund_reference: string; refund_notes: string }) => void;
  onCancel: () => void;
  loading?: boolean;
};

export function MarkRefundedModal({
  open,
  orderNumber,
  refundAmount,
  suggestedReference = "",
  onConfirm,
  onCancel,
  loading = false
}: MarkRefundedModalProps) {
  const [reference, setReference] = useState(suggestedReference);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setReference(suggestedReference);
      setNotes("");
    }
  }, [open, suggestedReference]);

  if (!open) return null;

  const canConfirm = reference.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="font-bold text-primary">Mark Refund Completed</h2>
        <p className="mt-1 text-sm text-foreground/60">Order {orderNumber}</p>

        <label className="mt-4 block text-sm">
          <span className="text-foreground/70">Amount Refunded</span>
          <input
            type="text"
            readOnly
            className="mt-1 w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm font-semibold tabular-nums"
            value={formatCurrency(refundAmount)}
          />
        </label>

        <label className="mt-3 block text-sm">
          <span className="text-foreground/70">
            Transaction Reference / UTR Number <span className="text-red-600">*</span>
          </span>
          <input
            type="text"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Enter UTR or transaction reference"
            autoFocus
          />
        </label>

        <label className="mt-3 block text-sm">
          <span className="text-foreground/70">Refund Notes (optional)</span>
          <textarea
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes about this refund"
          />
        </label>

        <div className="mt-4 flex gap-2">
          <button type="button" className="flex-1 rounded-lg border px-4 py-2 text-sm" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary flex-1"
            disabled={loading || !canConfirm}
            onClick={() =>
              onConfirm({
                refund_reference: reference.trim(),
                refund_notes: notes.trim()
              })
            }
          >
            {loading ? "Saving…" : "Confirm Refund"}
          </button>
        </div>
      </div>
    </div>
  );
}
