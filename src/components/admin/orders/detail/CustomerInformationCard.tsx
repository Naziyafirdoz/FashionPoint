"use client";

import {
  customerEmail,
  customerName,
  formatOrderDate,
  formatOrderTime,
  itemsCount,
  paymentMethodLabel,
  paymentStatusLabel
} from "@/lib/orders/admin-orders";
import { resolvePrimaryPhone, resolveSecondaryPhone } from "@/lib/delivery/location";
import type { Order } from "@/types";

type CustomerInformationCardProps = {
  order: Order;
};

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </div>
  );
}

export function CustomerInformationCard({ order }: CustomerInformationCardProps) {
  const primaryPhone = resolvePrimaryPhone(order.shipping_address) || "—";
  const secondaryPhone = resolveSecondaryPhone(order.shipping_address) || "—";

  return (
    <section className="flex h-full min-h-[22rem] flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Customer Information
      </h2>
      <dl className="mt-3 grid flex-1 grid-cols-1 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
        <InfoField label="Name" value={customerName(order)} />
        <InfoField label="Primary Mobile" value={primaryPhone} />
        <InfoField label="Secondary Mobile" value={secondaryPhone} />
        <div className="sm:col-span-2">
          <dt className="text-gray-500">Email</dt>
          <dd className="break-all font-medium text-gray-900">{customerEmail(order)}</dd>
        </div>
        <InfoField label="Payment Method" value={paymentMethodLabel(order.payment_method)} />
        <InfoField label="Payment Status" value={paymentStatusLabel(order.payment_status)} />
        <InfoField label="Items" value={String(itemsCount(order))} />
        <InfoField
          label="Order Date"
          value={`${formatOrderDate(order.created_at)} · ${formatOrderTime(order.created_at)}`}
        />
      </dl>
    </section>
  );
}
