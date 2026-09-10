"use client";

import { useState } from "react";
import toast from "react-hot-toast";

type DeliveryFollowUpNotificationCardProps = {
  orderId: string;
  orderNumber: string;
  notificationId: string;
  fallbackMessage: string;
  onActionComplete?: () => void;
};

function parseLine(message: string, prefix: string): string {
  const line = message.split("\n").find((row) => row.startsWith(`${prefix}:`));
  return line?.slice(prefix.length + 1).trim() ?? "";
}

export function DeliveryFollowUpNotificationCard({
  orderId,
  orderNumber,
  notificationId,
  fallbackMessage,
  onActionComplete
}: DeliveryFollowUpNotificationCardProps) {
  const [loading, setLoading] = useState<"deliver" | "snooze" | null>(null);

  const displayOrderNumber = parseLine(fallbackMessage, "Order ID") || orderNumber;
  const displayCustomer = parseLine(fallbackMessage, "Customer") || "—";
  const displayPhone = parseLine(fallbackMessage, "Phone") || "—";
  const displayStatus = parseLine(fallbackMessage, "Current Status") || "Shipped";

  const handleSnooze = async () => {
    setLoading("snooze");
    try {
      const res = await fetch(`/api/orders/${orderId}/delivery-follow-up`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "snooze" })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to snooze reminder");
        return;
      }
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notificationId })
      });
      toast.success("Reminder scheduled in 2 hours");
      onActionComplete?.();
    } finally {
      setLoading(null);
    }
  };

  const handleMarkDelivered = async () => {
    setLoading("deliver");
    try {
      const res = await fetch(`/api/orders/${orderId}/mark-delivered`, {
        method: "POST",
        credentials: "include",
        cache: "no-store"
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to mark delivered");
        return;
      }

      await fetch(`/api/orders/${orderId}/send-delivery-confirmation-email`, {
        method: "POST",
        credentials: "include"
      });

      await fetch(`/api/orders/${orderId}/delivery-follow-up`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" })
      });

      await fetch("/api/admin/notifications", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notificationId })
      });

      toast.success("Order marked as delivered");
      onActionComplete?.();
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-2 space-y-2 text-xs leading-relaxed text-gray-700">
      <p className="font-semibold text-gray-900">Order ID: {displayOrderNumber}</p>
      <p>
        <span className="text-gray-500">Customer:</span>
        <br />
        {displayCustomer}
      </p>
      <p>
        <span className="text-gray-500">Phone:</span>
        <br />
        {displayPhone}
      </p>
      <p>
        <span className="text-gray-500">Current Status:</span>
        <br />
        {displayStatus}
      </p>
      <p className="pt-1 font-medium text-gray-900">
        Has this order been handed over to the customer?
      </p>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          disabled={loading != null}
          onClick={() => void handleMarkDelivered()}
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50"
        >
          {loading === "deliver" ? "Updating…" : "Admin Override: Mark Delivered"}
        </button>
        <button
          type="button"
          disabled={loading != null}
          onClick={() => void handleSnooze()}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading === "snooze" ? "Scheduling…" : "⏰ Remind Me After 2 Hours"}
        </button>
      </div>
    </div>
  );
}
