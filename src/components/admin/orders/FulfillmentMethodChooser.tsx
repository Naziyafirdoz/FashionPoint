"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { Order } from "@/types";
import {
  allowedFulfillmentMethodsForZone,
  type FulfillmentMethod
} from "@/lib/orders/fulfillment-method";
import type { FulfillmentZone } from "@/lib/orders/fulfillment-zone";
import { formatShippingAddress } from "@/lib/orders/fulfillment-workflow";
import {
  formatStoreInformationFromAddressLines,
  type StoreInformationShipmentSource
} from "@/lib/orders/customer-shipment-display";

type DeliveryWorker = {
  user_id: string;
  name: string;
  display_name?: string | null;
  email: string | null;
  phone?: string | null;
  label?: string;
};

type FulfillmentMethodChooserProps = {
  order: Order;
  /** Resolved from active branch service areas (local vs outstation). */
  zone: FulfillmentZone;
  /** Admin Settings → Store Information (shipping origin). */
  shippingOrigin: StoreInformationShipmentSource;
  disabled?: boolean;
  onUpdated: (order: Order) => void;
  onOpenRapidoGuide?: () => void;
};

export function FulfillmentMethodChooser({
  order,
  zone,
  shippingOrigin,
  disabled,
  onUpdated,
  onOpenRapidoGuide
}: FulfillmentMethodChooserProps) {
  const methods = useMemo(() => allowedFulfillmentMethodsForZone(zone), [zone]);
  const [tracking, setTracking] = useState("");
  const [method, setMethod] = useState<FulfillmentMethod | null>(null);
  const [workers, setWorkers] = useState<DeliveryWorker[]>([]);
  const [workerId, setWorkerId] = useState("");
  const [busy, setBusy] = useState(false);

  const isOutstationDtdc = zone === "outstation";

  useEffect(() => {
    if (isOutstationDtdc) {
      setMethod("dtdc");
      return;
    }
    setMethod((current) => {
      if (current && methods.includes(current)) return current;
      return methods.length === 1 ? methods[0] : null;
    });
  }, [methods, isOutstationDtdc]);

  const loadWorkers = useCallback(async () => {
    const res = await fetch("/api/admin/delivery-workers", { credentials: "include" });
    const data = await res.json();
    if (res.ok) {
      setWorkers((data.workers as DeliveryWorker[]) ?? []);
    }
  }, []);

  useEffect(() => {
    if (method === "delivery_boy") {
      void loadWorkers();
    }
  }, [method, loadWorkers]);

  const confirmCourier = async (selected: "rapido" | "dtdc") => {
    if (busy || disabled) return;
    if (selected === "dtdc" && !tracking.trim()) {
      toast.error("Enter the DTDC Tracking Number");
      return;
    }

    const trackingNumber =
      selected === "rapido"
        ? (order.tracking_number ?? order.tracking_id ?? "").trim() || undefined
        : tracking.trim() || undefined;

    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/mark-shipped`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fulfillment_method: selected,
          tracking_number: trackingNumber
        })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to mark shipped");
        return;
      }
      toast.success(data.message ?? "Order shipped");
      if (data.order) onUpdated(data.order as Order);
    } finally {
      setBusy(false);
    }
  };

  const confirmDeliveryBoy = async () => {
    if (busy || disabled) return;
    if (!workerId) {
    toast.error("Select delivery staff");
    return;
  }
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/assign-delivery`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delivery_worker_id: workerId })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to assign delivery");
        return;
      }
      toast.success(data.message ?? "Assigned for delivery");
      if (data.order) onUpdated(data.order as Order);
    } finally {
      setBusy(false);
    }
  };

  const deliveryTypeLabel = zone === "local" ? "Local" : "Outstation";
  const fromAddressLines = formatStoreInformationFromAddressLines(shippingOrigin);
  const fromDisplay = fromAddressLines.length ? fromAddressLines.join("\n") : "—";

  return (
    <section className="rounded-xl border border-yellow-300 bg-yellow-50 p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-yellow-950">
        Ready for Shipping
      </h2>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">From</dt>
          <dd className="mt-1 whitespace-pre-line text-gray-900">{fromDisplay}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">To</dt>
          <dd className="mt-1 whitespace-pre-line text-gray-900">
            {formatShippingAddress(order)}
          </dd>
        </div>
      </dl>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Delivery Type
          </dt>
          <dd className="mt-1 text-sm font-semibold text-gray-900">{deliveryTypeLabel}</dd>
          <p className="mt-0.5 text-xs text-gray-500">
            Based on the customer address and active branch service areas.
          </p>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Delivery Method
          </dt>
          {isOutstationDtdc ? (
            <dd className="mt-1 text-sm font-semibold text-gray-900">DTDC</dd>
          ) : (
            <dd className="mt-2 flex flex-wrap gap-2">
              {methods.map((option) => {
                const label =
                  option === "rapido" ? "Rapido" : option === "dtdc" ? "DTDC" : "Delivery Staff";
                const selected = method === option;
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={disabled || busy}
                    onClick={() => {
                      setMethod(option);
                      if (option === "rapido" && onOpenRapidoGuide) {
                        onOpenRapidoGuide();
                      }
                    }}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-sm disabled:opacity-50 ${
                      selected
                        ? "bg-primary text-white"
                        : "border border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </dd>
          )}
        </div>
      </dl>

      {method === "rapido" ? (
        <div className="mt-5">
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => void confirmCourier("rapido")}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Confirm Shipping (Rapido)
          </button>
        </div>
      ) : null}

      {method === "dtdc" ? (
        <div className="mt-5 space-y-4 rounded-lg border border-gray-100 bg-gray-50/80 p-4">
          <label className="block text-sm">
            <span className="font-medium text-gray-800">DTDC Tracking Number</span>
            <input
              type="text"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              placeholder="Enter DTDC tracking / AWB number"
              required
            />
          </label>

          <button
            type="button"
            disabled={disabled || busy || !tracking.trim()}
            onClick={() => void confirmCourier("dtdc")}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Confirming…" : "Confirm Shipping (DTDC)"}
          </button>
        </div>
      ) : null}

      {method === "delivery_boy" ? (
        <div className="mt-5 space-y-3 rounded-lg border border-gray-100 bg-gray-50/80 p-4">
          <label className="block text-sm">
            <span className="text-gray-600">Assign Delivery Staff</span>
            <select
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Select delivery staff…</option>
              {workers.map((w) => {
                const label =
                  w.label?.trim() ||
                  (w.phone?.trim()
                    ? `${w.display_name || w.name} — ${w.phone.trim()}`
                    : w.display_name || w.name);
                return (
                  <option key={w.user_id} value={w.user_id}>
                    {label}
                  </option>
                );
              })}
            </select>
          </label>
          {workers.length === 0 ? (
            <p className="text-xs text-amber-800">
              No Delivery Staff found. Add one under Settings → Staff &amp; Roles.
            </p>
          ) : null}
          <button
            type="button"
            disabled={disabled || busy || !workerId}
            onClick={() => void confirmDeliveryBoy()}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Assign &amp; Mark Out for Delivery
          </button>
        </div>
      ) : null}
    </section>
  );
}
