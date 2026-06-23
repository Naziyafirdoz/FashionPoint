"use client";

import type { Order } from "@/types";

type OrderFinancialSummaryProps = {
  order: Order;
};

export function OrderFinancialSummary({ order }: OrderFinancialSummaryProps) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Financial Summary
      </h2>
      <dl className="mt-2 space-y-1.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-gray-500">Subtotal</dt>
          <dd className="tabular-nums text-gray-900">
            ₹{Number(order.subtotal).toLocaleString("en-IN")}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-gray-500">Shipping</dt>
          <dd className="tabular-nums text-gray-900">
            ₹{Number(order.shipping_amount).toLocaleString("en-IN")}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-gray-500">Discount</dt>
          <dd className="tabular-nums text-gray-900">
            ₹{Number(order.discount_amount).toLocaleString("en-IN")}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-gray-500">Tax</dt>
          <dd className="tabular-nums text-gray-900">
            ₹{Number(order.tax_amount ?? 0).toLocaleString("en-IN")}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-gray-100 pt-2 font-semibold text-gray-900">
          <dt>Total</dt>
          <dd className="tabular-nums">₹{Number(order.total).toLocaleString("en-IN")}</dd>
        </div>
      </dl>
    </div>
  );
}
