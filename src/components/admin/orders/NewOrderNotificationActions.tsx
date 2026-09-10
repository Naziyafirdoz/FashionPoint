"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";

type NewOrderNotificationActionsProps = {
  orderId: string;
  disabled?: boolean;
  onActionComplete?: () => void;
};

/** Remind / view only — order approval is email-only. */
export function NewOrderNotificationActions({
  orderId,
  disabled = false,
  onActionComplete
}: NewOrderNotificationActionsProps) {
  const [loading, setLoading] = useState(false);

  const remindLater = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/remind-later`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to schedule reminder");
        return;
      }
      toast.success(data.message ?? "Reminder scheduled");
      onActionComplete?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[11px] leading-snug text-gray-500">
        Approve this order from the <span className="font-semibold">Approve Order</span> button in
        the new-order email.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/admin/orders/${orderId}`}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90"
        >
          View Order
        </Link>
        <button
          type="button"
          disabled={disabled || loading}
          onClick={() => void remindLater()}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {loading ? "Scheduling…" : "Remind 2 Hours"}
        </button>
      </div>
    </div>
  );
}
