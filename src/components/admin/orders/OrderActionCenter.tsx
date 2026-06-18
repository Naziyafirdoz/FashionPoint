"use client";

import type { NotificationSummaryCounts } from "@/lib/admin/order-action-center";

export type NotificationPulseKey = "newOrders" | "readyForShipping" | null;

type OrderActionCenterProps = {
  counts: NotificationSummaryCounts;
  pulseKey: NotificationPulseKey;
  onNewOrdersClick: () => void;
  onReadyForShippingClick?: () => void;
};

function SummaryChip({
  emoji,
  label,
  count,
  className,
  pulse,
  onClick
}: {
  emoji: string;
  label: string;
  count: number;
  className: string;
  pulse: boolean;
  onClick: () => void;
}) {
  if (count <= 0) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80 ${className} ${
        pulse ? "animate-[pulse_0.5s_ease-in-out_2]" : ""
      }`}
    >
      <span aria-hidden>{emoji}</span>
      <span>
        {label} ({count})
      </span>
    </button>
  );
}

export function OrderActionCenter({
  counts,
  pulseKey,
  onNewOrdersClick,
  onReadyForShippingClick
}: OrderActionCenterProps) {
  if (!counts.newOrders && !counts.readyForShipping) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Order notifications"
      className="flex max-h-20 flex-nowrap items-center gap-2 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 shadow-sm"
    >
      <SummaryChip
        emoji="🔴"
        label="New Orders"
        count={counts.newOrders}
        className="bg-red-600 text-white"
        pulse={pulseKey === "newOrders"}
        onClick={onNewOrdersClick}
      />
      <SummaryChip
        emoji="📦"
        label="Ready For Shipping"
        count={counts.readyForShipping}
        className="bg-blue-600 text-white"
        pulse={pulseKey === "readyForShipping"}
        onClick={onReadyForShippingClick ?? onNewOrdersClick}
      />
    </div>
  );
}
