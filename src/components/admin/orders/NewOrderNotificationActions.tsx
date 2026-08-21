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
  const [loading, setLoading] = useState(false);

  const approve = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => void approve()}
        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
      >
        {loading ? "Approving…" : "Approve"}
      </button>
    </div>
  );
}
