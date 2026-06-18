"use client";

import { formatCurrencyCompact } from "@/lib/orders/admin-order-ui";

type OperationsSummaryBarProps = {
  ordersToday: number;
  revenueToday: number;
  readyToShip: number;
  outForDelivery: number;
  refundPending: number;
};

function Metric({
  label,
  value,
  format = "number"
}: {
  label: string;
  value: number;
  format?: "number" | "currency";
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <span className="text-2xl font-semibold tracking-tight text-gray-900 tabular-nums">
        {format === "currency" ? formatCurrencyCompact(value) : value.toLocaleString("en-IN")}
      </span>
      <span className="mt-0.5 text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </span>
    </div>
  );
}

export function OperationsSummaryBar({
  ordersToday,
  revenueToday,
  readyToShip,
  outForDelivery,
  refundPending
}: OperationsSummaryBarProps) {
  return (
    <section
      aria-label="Operations summary"
      className="grid grid-cols-2 gap-3 lg:grid-cols-5"
    >
      <Metric label="Orders Today" value={ordersToday} />
      <Metric label="Revenue Today" value={revenueToday} format="currency" />
      <Metric label="Ready To Ship" value={readyToShip} />
      <Metric label="Out For Delivery" value={outForDelivery} />
      <Metric label="Refund Pending" value={refundPending} />
    </section>
  );
}
