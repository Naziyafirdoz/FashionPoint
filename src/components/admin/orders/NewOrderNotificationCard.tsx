"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  customerName,
  customerPhone,
  formatCurrency,
  paymentMethodLabel,
  paymentStatusLabel
} from "@/lib/orders/admin-orders";
import { formatShippingAddress, isAwaitingOrderApproval } from "@/lib/orders/fulfillment-workflow";
import { normalizeOrderItems } from "@/lib/orders/order-items";
import { NewOrderNotificationActions } from "@/components/admin/orders/NewOrderNotificationActions";
import type { Order } from "@/types";

type NewOrderNotificationCardProps = {
  orderId: string;
  fallbackMessage: string;
  onActionComplete?: () => void;
};

export function NewOrderNotificationCard({
  orderId,
  fallbackMessage,
  onActionComplete
}: NewOrderNotificationCardProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/orders/${orderId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.order) setOrder(data.order as Order);
      })
      .catch(() => {
        if (!cancelled) setOrder(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (loading) {
    return <p className="mt-2 text-xs text-gray-500">Loading order details…</p>;
  }

  if (!order) {
    return (
      <div className="mt-2 space-y-1 text-xs leading-relaxed text-gray-600">
        {fallbackMessage.split("\n").map((line, index) =>
          line.trim() ? <p key={`${orderId}-fb-${index}`}>{line}</p> : null
        )}
        <NewOrderNotificationActions orderId={orderId} onActionComplete={onActionComplete} />
      </div>
    );
  }

  const items = normalizeOrderItems(order.items);
  const first = items[0];
  const showActions = isAwaitingOrderApproval(order.status as string);

  return (
    <div className="mt-2 space-y-3 text-xs text-gray-700">
      <dl className="grid gap-1 sm:grid-cols-2">
        <div>
          <dt className="text-gray-500">Order ID</dt>
          <dd className="font-medium">{order.order_number}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Order Amount</dt>
          <dd className="font-semibold tabular-nums">{formatCurrency(Number(order.total))}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Payment Method</dt>
          <dd>{paymentMethodLabel(order.payment_method)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Payment Status</dt>
          <dd>{paymentStatusLabel(order.payment_status)}</dd>
        </div>
      </dl>

      {first ? (
        <div className="flex gap-3 rounded-lg border border-gray-100 bg-gray-50/80 p-2">
          {first.image ? (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-white">
              <Image src={first.image} alt="" fill className="object-cover" />
            </div>
          ) : null}
          <div className="min-w-0">
            <p className="font-medium text-gray-900">{first.name}</p>
            <p>SKU: {first.sku ?? "—"}</p>
            <p>
              {first.size} · {first.color} · Qty {first.quantity}
            </p>
            <p className="tabular-nums">{formatCurrency(first.price * first.quantity)}</p>
          </div>
        </div>
      ) : null}

      <dl className="space-y-1">
        <div>
          <dt className="text-gray-500">Customer Name</dt>
          <dd>{customerName(order)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Customer Mobile</dt>
          <dd>{customerPhone(order)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Shipping Address</dt>
          <dd className="whitespace-pre-line">{formatShippingAddress(order)}</dd>
        </div>
      </dl>

      {showActions ? (
        <NewOrderNotificationActions orderId={orderId} onActionComplete={onActionComplete} />
      ) : (
        <p className="text-gray-500">This order has already been approved.</p>
      )}
      <a
        href={`/admin/orders/${orderId}`}
        className="inline-flex rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90"
      >
        View order
      </a>
    </div>
  );
}
