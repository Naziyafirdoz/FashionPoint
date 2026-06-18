"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

type NewOrderNotificationActionsProps = {
  orderId: string;
  disabled?: boolean;
  onActionComplete?: () => void;
};

export function NewOrderNotificationActions({
  orderId,
  disabled = false,
  onActionComplete
}: NewOrderNotificationActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "remind" | null>(null);

  const approve = async () => {
    setLoading("approve");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/approve-order`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to approve order");
        return;
      }
      toast.success(data.message ?? "Order approved");
      onActionComplete?.();
      router.refresh();
    } finally {
      setLoading(null);
    }
  };

  const remindLater = async () => {
    setLoading("remind");
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
      setLoading(null);
    }
  };

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        disabled={disabled || loading != null}
        onClick={() => void approve()}
        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
      >
        {loading === "approve" ? "Approving…" : "Approve Order"}
      </button>
      <button
        type="button"
        disabled={disabled || loading != null}
        onClick={() => void remindLater()}
        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
      >
        {loading === "remind" ? "Scheduling…" : "Remind Me Later"}
      </button>
    </div>
  );
}
