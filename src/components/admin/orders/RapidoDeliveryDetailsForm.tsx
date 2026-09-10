"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getRapidoDeliveryDetails,
  DEFAULT_COURIER_NAME,
  type RapidoDeliveryDetails
} from "@/lib/orders/rapido-delivery-metadata";
import type { Order } from "@/types";

type RapidoDeliveryDetailsFormProps = {
  orderId: string;
  order: Pick<Order, "shipping_address" | "tracking_number" | "tracking_id">;
  onSaved?: (order: Order) => void;
  /** Compact styling when embedded in Ready for Shipping. */
  variant?: "standalone" | "embedded";
  /** Hide the dedicated save button (parent may save then ship). */
  hideSaveButton?: boolean;
};

const EMPTY: RapidoDeliveryDetails = {
  courier_name: DEFAULT_COURIER_NAME,
  rider_name: "",
  rider_phone: "",
  vehicle_number: "",
  pickup_time: "",
  notes: ""
};

/** Mock/auto-generated tracking from the stub provider — not real admin-entered AWB. */
function isMockOrPlaceholderTracking(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return /^MOCK-RPD[\w-]*/i.test(trimmed) || /^mock-shp[\w-]*/i.test(trimmed);
}

function toDatetimeLocalValue(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function RapidoDeliveryDetailsForm({
  orderId,
  order,
  onSaved,
  variant = "standalone",
  hideSaveButton = false
}: RapidoDeliveryDetailsFormProps) {
  const [form, setForm] = useState<RapidoDeliveryDetails>(EMPTY);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const saved = getRapidoDeliveryDetails(order);
    const hasSavedDetails = Boolean(
      saved &&
        (saved.rider_name?.trim() ||
          saved.rider_phone?.trim() ||
          saved.vehicle_number?.trim() ||
          saved.pickup_time?.trim() ||
          saved.notes?.trim() ||
          (saved.courier_name?.trim() &&
            saved.courier_name.trim() !== DEFAULT_COURIER_NAME))
    );

    // New booking: empty entry form. Editing: load genuinely saved details only.
    if (hasSavedDetails && saved) {
      setForm({
        courier_name: saved.courier_name?.trim() || DEFAULT_COURIER_NAME,
        rider_name: saved.rider_name ?? "",
        rider_phone: saved.rider_phone ?? "",
        vehicle_number: saved.vehicle_number ?? "",
        pickup_time: saved.pickup_time ?? "",
        notes: saved.notes ?? ""
      });
    } else {
      setForm({ ...EMPTY });
    }

    const existingTracking = (order.tracking_number ?? order.tracking_id ?? "").trim();
    setTrackingNumber(
      isMockOrPlaceholderTracking(existingTracking) ? "" : existingTracking
    );
  }, [order]);

  const updateField = (key: keyof RapidoDeliveryDetails, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (saving) return;
    const courierName = form.courier_name?.trim();
    if (!courierName) {
      toast.error("Delivery partner name is required");
      return;
    }

    setSaving(true);
    try {
      const pickupIso = form.pickup_time
        ? new Date(form.pickup_time).toISOString()
        : "";

      const res = await fetch(`/api/orders/${orderId}/rapido-delivery-details`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          courier_name: courierName,
          pickup_time: pickupIso || form.pickup_time,
          tracking_number: trackingNumber.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to save Rapido delivery details");
        return;
      }
      toast.success("Rapido delivery details saved");
      if (data.order) onSaved?.(data.order as Order);
    } finally {
      setSaving(false);
    }
  };

  const embedded = variant === "embedded";
  const labelClass = embedded ? "text-gray-600" : "font-medium text-maroon";

  return (
    <section
      className={
        embedded
          ? "mt-0 rounded-lg border border-gray-200 bg-white p-4"
          : "mt-6 rounded-xl border-2 border-gold/35 bg-gradient-to-br from-white to-gold/5 p-4 md:p-5"
      }
    >
      <h3
        className={
          embedded
            ? "text-sm font-semibold text-gray-900"
            : "font-display text-lg font-bold text-maroon"
        }
      >
        Rapido Delivery Details
      </h3>
      <p className={`mt-1 text-sm ${embedded ? "text-gray-600" : "text-maroon/80"}`}>
        Enter the actual Rapido booking details after you book the parcel. Tracking Number is
        optional.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className={labelClass}>Tracking Number</span>
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
            placeholder="Optional AWB / Tracking ID"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className={labelClass}>
            Delivery Partner / Courier Name <span className="text-red-600">*</span>
          </span>
          <input
            type="text"
            required
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
            placeholder={DEFAULT_COURIER_NAME}
            value={form.courier_name ?? DEFAULT_COURIER_NAME}
            onChange={(e) => updateField("courier_name", e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className={labelClass}>Rider Name</span>
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
            placeholder="Enter rider name"
            value={form.rider_name ?? ""}
            onChange={(e) => updateField("rider_name", e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className={labelClass}>Rider Phone Number</span>
          <input
            type="tel"
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
            placeholder="Enter rider phone number"
            value={form.rider_phone ?? ""}
            onChange={(e) => updateField("rider_phone", e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className={labelClass}>Vehicle Number</span>
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
            placeholder="Enter vehicle number"
            value={form.vehicle_number ?? ""}
            onChange={(e) => updateField("vehicle_number", e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className={labelClass}>Pickup Time</span>
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
            value={toDatetimeLocalValue(form.pickup_time)}
            onChange={(e) => updateField("pickup_time", e.target.value)}
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className={labelClass}>Notes</span>
          <textarea
            rows={2}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
            placeholder="Add any delivery notes"
            value={form.notes ?? ""}
            onChange={(e) => updateField("notes", e.target.value)}
          />
        </label>
      </div>

      {!hideSaveButton ? (
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className={
            embedded
              ? "mt-4 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              : "mt-4 rounded-xl border-2 border-maroon bg-maroon px-4 py-2 text-sm font-semibold text-white hover:bg-maroon-light disabled:opacity-50"
          }
        >
          {saving ? "Saving…" : "Save Rapido Delivery Details"}
        </button>
      ) : null}
    </section>
  );
}
