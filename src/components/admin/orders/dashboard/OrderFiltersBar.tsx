"use client";

import { useState } from "react";
import Link from "next/link";
import { orderStatusLabel } from "@/lib/orders/workflow";
import type { AdminOrdersTab } from "@/lib/orders/workflow";
import type { OrderStatus } from "@/types";

type OrderFiltersBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  paymentFilter: string;
  onPaymentFilterChange: (value: string) => void;
  statusFilter: AdminOrdersTab;
  onStatusFilterChange: (tab: AdminOrdersTab) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
};

const STATUS_OPTIONS: AdminOrdersTab[] = [
  "all",
  "pending",
  "processing",
  "ready_to_ship",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "refunds",
  "refunded"
];

export function OrderFiltersBar({
  search,
  onSearchChange,
  paymentFilter,
  onPaymentFilterChange,
  statusFilter,
  onStatusFilterChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange
}: OrderFiltersBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filterFields = (
    <>
      <div className="min-w-0 flex-1">
        <label htmlFor="order-search" className="sr-only">
          Search orders
        </label>
        <input
          id="order-search"
          type="search"
          placeholder="Search order ID, name, phone…"
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <select
        aria-label="Payment method"
        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        value={paymentFilter}
        onChange={(e) => onPaymentFilterChange(e.target.value)}
      >
        <option value="all">All payments</option>
        <option value="upi">UPI</option>
        <option value="card">Card</option>
        <option value="cod">COD</option>
        <option value="netbanking">Net Banking</option>
        <option value="wallet">Wallet</option>
      </select>
      <select
        aria-label="Order status"
        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value as AdminOrdersTab)}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s === "all" ? "All statuses" : orderStatusLabel(s)}
          </option>
        ))}
      </select>
      <input
        type="date"
        aria-label="From date"
        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        value={dateFrom}
        onChange={(e) => onDateFromChange(e.target.value)}
      />
      <input
        type="date"
        aria-label="To date"
        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        value={dateTo}
        onChange={(e) => onDateToChange(e.target.value)}
      />
    </>
  );

  return (
    <section aria-label="Order filters" className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="hidden flex-wrap items-center gap-2 lg:flex">{filterFields}</div>
      <div className="flex items-center gap-2 lg:hidden">
        <div className="min-w-0 flex-1">
          <input
            type="search"
            placeholder="Search orders…"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700"
          onClick={() => setDrawerOpen(true)}
        >
          Filters
        </button>
        <Link
          href="/admin/orders/analytics"
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-primary"
        >
          Analytics
        </Link>
      </div>
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close filters"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Filters</h3>
              <button
                type="button"
                className="text-sm text-gray-500"
                onClick={() => setDrawerOpen(false)}
              >
                Done
              </button>
            </div>
            <div className="flex flex-col gap-3">{filterFields}</div>
          </div>
        </div>
      ) : null}
      <div className="mt-2 hidden justify-end lg:flex">
        <Link href="/admin/orders/analytics" className="text-xs font-medium text-primary hover:underline">
          View analytics →
        </Link>
      </div>
    </section>
  );
}
