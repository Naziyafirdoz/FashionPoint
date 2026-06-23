"use client";

import Link from "next/link";
import {
  customerName,
  customerPhone,
  formatCurrency,
  formatOrderDate,
  formatOrderTime,
  paymentMethodLabel,
  paymentStatusLabel
} from "@/lib/orders/admin-orders";
import { getStageLabel, getStagePillClass } from "@/lib/orders/admin-order-ui";
import type { Order } from "@/types";

type OrderDetailHeaderProps = {
  order: Order;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
  primaryActionDisabled?: boolean;
};

export function OrderDetailHeader({
  order,
  onPrimaryAction,
  primaryActionLabel,
  primaryActionDisabled
}: OrderDetailHeaderProps) {
  return (
    <header className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/orders"
            className="text-xs font-medium text-gray-500 hover:text-primary"
          >
            ← Operations
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
            {order.order_number}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {formatOrderDate(order.created_at)} · {formatOrderTime(order.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold shadow-sm ${getStagePillClass(order)}`}
          >
            {getStageLabel(order)}
          </span>
          {primaryActionLabel && onPrimaryAction ? (
            <button
              type="button"
              disabled={primaryActionDisabled}
              onClick={onPrimaryAction}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {primaryActionLabel}
            </button>
          ) : null}
        </div>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-gray-50 px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Customer</dt>
          <dd className="mt-1 font-semibold text-gray-900">{customerName(order)}</dd>
          <dd className="text-sm text-gray-600">{customerPhone(order)}</dd>
        </div>
        <div className="rounded-xl bg-gray-50 px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Payment</dt>
          <dd className="mt-1 font-semibold text-gray-900">{paymentMethodLabel(order.payment_method)}</dd>
          <dd className="text-sm text-gray-600">{paymentStatusLabel(order.payment_status)}</dd>
        </div>
        <div className="rounded-xl bg-gray-50 px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Amount</dt>
          <dd className="mt-1 text-xl font-bold tabular-nums text-gray-900">
            {formatCurrency(Number(order.total))}
          </dd>
        </div>
        <div className="rounded-xl bg-gray-50 px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Status</dt>
          <dd className="mt-1 font-semibold text-gray-900">{getStageLabel(order)}</dd>
        </div>
      </dl>
    </header>
  );
}
