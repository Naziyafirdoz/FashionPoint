"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { customerName, customerPhone, formatCurrency } from "@/lib/orders/admin-orders";
import { formatShippingAddress } from "@/lib/orders/fulfillment-workflow";
import { normalizeOrderItems } from "@/lib/orders/order-items";
import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import type { Order } from "@/types";

export function DeliveryOrdersClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const markOrderId = searchParams.get("mark");
  const actionToken = searchParams.get("t");

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [otpOrderId, setOtpOrderId] = useState<string | null>(null);
  const [otpValue, setOtpValue] = useState("");
  const [markHandled, setMarkHandled] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/delivery/orders", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to load delivery orders");
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

  // Deep-link from Mark Delivery email: open OTP panel for the target order.
  useEffect(() => {
    if (!markOrderId || loading || markHandled === markOrderId) return;
    const target = orders.find((o) => o.id === markOrderId);
    if (!target) {
      setMarkHandled(markOrderId);
      toast.error("Delivery order not found or no longer available for verification.");
      router.replace("/admin/delivery");
      return;
    }
    const status = normalizeLegacyStatus(target.status);
    setMarkHandled(markOrderId);
    if (status === "delivered") {
      toast.success("Order already delivered.");
      setOtpOrderId(null);
      router.replace("/admin/delivery");
      return;
    }
    if (status === "out_for_delivery") {
      setOtpOrderId(markOrderId);
      setOtpValue("");
      requestAnimationFrame(() => {
        document
          .getElementById(`delivery-order-${markOrderId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [markOrderId, loading, orders, router, markHandled]);

  const openOtpPrompt = (orderId: string) => {
    setOtpOrderId(orderId);
    setOtpValue("");
  };

  const cancelOtpPrompt = () => {
    if (busyId) return;
    setOtpOrderId(null);
    setOtpValue("");
    if (markOrderId) {
      router.replace("/admin/delivery");
    }
  };

  const verifyDelivery = async (orderId: string) => {
    const otp = otpValue.trim();
    if (!otp || otp.length < 4) {
      toast.error("Enter the 4-digit delivery OTP provided by the customer");
      return;
    }

    setBusyId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/verify-delivery`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otp,
          ...(actionToken && markOrderId === orderId ? { action_token: actionToken } : {})
        })
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && /already|changed/i.test(String(data.error ?? ""))) {
          toast.success("Order already delivered.");
          setOtpOrderId(null);
          setOtpValue("");
          await load();
          router.replace("/admin/delivery");
          return;
        }
        toast.error(
          data.error ??
            "Invalid OTP. Please enter the correct 4-digit delivery OTP provided by the customer."
        );
        return;
      }
      toast.success(data.message ?? "Delivered");
      setOtpOrderId(null);
      setOtpValue("");
      await load();
      router.replace("/admin/delivery");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <AdminHeader title="Delivery" />
      <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
        <p className="text-sm text-gray-600">
          Orders assigned to you for delivery. Ask the customer for their delivery OTP, then verify
          to mark delivered.
        </p>
        {loading ? (
          <p className="text-sm text-gray-500">Loading assigned deliveries…</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-gray-500">No deliveries assigned right now.</p>
        ) : (
          orders.map((order) => {
            const items = normalizeOrderItems(order.items);
            const first = items[0];
            const busy = busyId === order.id;
            const showOtp = otpOrderId === order.id;
            const status = normalizeLegacyStatus(order.status);
            const isDelivered = status === "delivered";
            const isOutForDelivery = status === "out_for_delivery";

            return (
              <article
                key={order.id}
                id={`delivery-order-${order.id}`}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-gray-900">{order.order_number}</h2>
                    {isDelivered ? (
                      <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                        <span aria-hidden>🟢</span> Delivered
                      </p>
                    ) : (
                      <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
                        <span aria-hidden>🔵</span> Out for Delivery
                      </p>
                    )}
                  </div>
                  <p className="text-lg font-bold tabular-nums">
                    {formatCurrency(Number(order.total))}
                  </p>
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
                      <p className="text-gray-600">
                        {first.size} · {first.color} · Qty {first.quantity}
                      </p>
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

                <div className="mt-4">
                  {isDelivered ? (
                    <p className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2 text-sm font-semibold text-green-800">
                      ✓ Delivered
                    </p>
                  ) : showOtp ? (
                    <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
                      <p className="text-sm text-gray-700">
                        Enter the 4-digit OTP provided by the customer to confirm delivery.
                      </p>
                      <label className="block text-sm">
                        <span className="font-medium text-gray-800">Delivery OTP</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={4}
                          value={otpValue}
                          disabled={busy}
                          onChange={(e) =>
                            setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 4))
                          }
                          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-mono tracking-widest"
                          placeholder="Enter 4-digit OTP"
                          autoFocus={Boolean(markOrderId)}
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy || otpValue.trim().length < 4}
                          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                          onClick={() => void verifyDelivery(order.id)}
                        >
                          {busy ? "Verifying…" : "Verify Delivery"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-60"
                          onClick={cancelOtpPrompt}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : isOutForDelivery ? (
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                      onClick={() => openOtpPrompt(order.id)}
                    >
                      Mark Delivery
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
