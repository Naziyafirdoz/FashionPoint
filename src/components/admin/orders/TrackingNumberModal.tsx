"use client";

import { useEffect, useState } from "react";

type TrackingNumberModalProps = {
  open: boolean;
  orderNumber: string;
  initialValue?: string;
  onConfirm: (trackingNumber: string) => void;
  onCancel: () => void;
};

export function TrackingNumberModal({
  open,
  orderNumber,
  initialValue = "",
  onConfirm,
  onCancel
}: TrackingNumberModalProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="font-bold text-primary">Tracking number</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Enter tracking number for order {orderNumber} before marking as shipped.
        </p>
        <input
          type="text"
          className="mt-4 w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="Tracking number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
        <div className="mt-4 flex gap-2">
          <button type="button" className="btn-primary flex-1" onClick={() => onConfirm(value)}>
            Save &amp; mark shipped
          </button>
          <button
            type="button"
            className="flex-1 rounded-lg border px-4 py-2 text-sm"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
