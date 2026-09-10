"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { customerName, customerPhone, formatCurrency } from "@/lib/orders/admin-orders";
import { formatShippingAddress } from "@/lib/orders/fulfillment-workflow";
import { normalizeOrderItems } from "@/lib/orders/order-items";
import type { Order } from "@/types";

export function WorkerOrdersClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/worker/orders");
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to load orders");
        setOrders([]);
        return;
      }
      setOrders((data.orders as Order[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (orderId: string, path: string, body?: Record<string, unknown>) => {
    setBusyId(orderId);
    try {
      const res = await fetch(`/api/worker/orders/${orderId}/${path}`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Action failed");
        return;
      }
      toast.success(data.message ?? "Updated");
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <AdminHeader title="Worker Packing" />
      <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
        {loading ? (
          <p className="text-sm text-gray-500">Loading assigned orders…</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-gray-500">No orders assigned for packing.</p>
        ) : (
          orders.map((order) => {
            const items = normalizeOrderItems(order.items);
            const first = items[0];
            const busy = busyId === order.id;
            return (
              <article
                key={order.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-gray-900">{order.order_number}</h2>
                    <p className="text-sm text-gray-500">
                      Status:{" "}
                      {order.status === "packing_assigned"
                        ? "Packing"
                        : order.status === "packed"
                          ? "Packed"
                          : order.status}
                    </p>
                  </div>
                  <p className="text-lg font-bold tabular-nums">{formatCurrency(Number(order.total))}</p>
                </div>

                {first ? (
                  <div className="mt-4 flex gap-4">
                    {first.image ? (
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border">
                        <Image src={first.image} alt="" fill className="object-cover" />
                      </div>
                    ) : null}
                    <div className="text-sm">
                      <p className="font-medium">{first.name}</p>
                      <p className="text-gray-600">SKU: {first.sku ?? "—"}</p>
                      <p className="text-gray-600">
                        {first.size} · {first.color} · Qty {first.quantity}
                      </p>
                      <p className="text-gray-600">{formatCurrency(first.price * first.quantity)}</p>
                    </div>
                  </div>
                ) : null}

                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-gray-500">Customer</dt>
                    <dd>{customerName(order)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Phone</dt>
                    <dd>{customerPhone(order)}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-gray-500">Address</dt>
                    <dd className="whitespace-pre-line">{formatShippingAddress(order)}</dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(order.status as string) === "packing_assigned" ? (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                        onClick={() => void runAction(order.id, "packed")}
                      >
                        Packed
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded-lg border px-3 py-2 text-sm disabled:opacity-60"
                        onClick={() => void runAction(order.id, "still-pending")}
                      >
                        Still Pending
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded-lg border px-3 py-2 text-sm disabled:opacity-60"
                        onClick={() => void runAction(order.id, "remind-later", { hours: 1 })}
                      >
                        Remind Me After 1 Hour
                      </button>
                    </>
                  ) : null}
                  {(order.status as string) === "packed" ? (
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                      onClick={() => void runAction(order.id, "ready-for-shipping")}
                    >
                      Ready For Shipping
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </div>
    </>
  );
}
