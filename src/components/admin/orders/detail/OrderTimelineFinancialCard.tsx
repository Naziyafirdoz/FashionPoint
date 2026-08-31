"use client";

import { OrderDetailTimeline } from "@/components/admin/orders/detail/OrderDetailTimeline";
import { OrderFinancialSummary } from "@/components/admin/orders/detail/OrderFinancialSummary";
import type { Order } from "@/types";

type OrderTimelineFinancialCardProps = {
  order: Order;
  storeName: string;
};

export function OrderTimelineFinancialCard({ order, storeName }: OrderTimelineFinancialCardProps) {
  return (
    <section className="h-auto rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-2">
      <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <div className="flex h-full min-h-0 flex-col">
          <OrderDetailTimeline order={order} variant="embedded" storeName={storeName} />
        </div>
        <div className="flex h-full min-h-0 flex-col border-t border-gray-100 pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
          <OrderFinancialSummary order={order} />
        </div>
      </div>
    </section>
  );
}
