"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  formatPickupTimeDisplay,
  getRapidoDeliveryDetails,
  type RapidoDeliveryDetails
} from "@/lib/orders/rapido-delivery-metadata";
import type { Order } from "@/types";

type RapidoDeliveryDetailsFormProps = {
  orderId: string;
  order: Pick<Order, "shipping_address">;
  onSaved?: (order: Order) => void;
};

const EMPTY: RapidoDeliveryDetails = {
  rider_name: "",
  rider_phone: "",
  vehicle_number: "",
  pickup_time: "",
  notes: ""
};

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
  onSaved
}: RapidoDeliveryDetailsFormProps) {
  const [form, setForm] = useState<RapidoDeliveryDetails>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const saved = getRapidoDeliveryDetails(order);
    setForm({
      rider_name: saved?.rider_name ?? "",
      rider_phone: saved?.rider_phone ?? "",
      vehicle_number: saved?.vehicle_number ?? "",
      pickup_time: saved?.pickup_time ?? "",
      notes: saved?.notes ?? ""
    });
  }, [order]);

  const updateField = (key: keyof RapidoDeliveryDetails, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
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
          pickup_time: pickupIso || form.pickup_time
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

  const displayPickup = formatPickupTimeDisplay(form.pickup_time);

  return (
    <section className="mt-6 rounded-xl border-2 border-gold/35 bg-gradient-to-br from-white to-gold/5 p-4 md:p-5">
      <h3 className="font-display text-lg font-bold text-maroon">Rapido Delivery Details</h3>
      <p className="mt-1 text-sm text-maroon/70">
        Save rider details before marking the order shipped. These are stored on the order and included
        in the customer shipped email.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-maroon">Rider Name</span>
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-gold/30 bg-white px-3 py-2 text-sm text-gray-900"
            placeholder="Ravi Kumar"
            value={form.rider_name ?? ""}
            onChange={(e) => updateField("rider_name", e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-maroon">Rider Phone Number</span>
          <input
            type="tel"
            className="mt-1 w-full rounded-lg border border-gold/30 bg-white px-3 py-2 text-sm text-gray-900"
            placeholder="9876543210"
            value={form.rider_phone ?? ""}
            onChange={(e) => updateField("rider_phone", e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-maroon">Vehicle Number</span>
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-gold/30 bg-white px-3 py-2 text-sm text-gray-900"
            placeholder="AP39 AB 1234"
            value={form.vehicle_number ?? ""}
            onChange={(e) => updateField("vehicle_number", e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-maroon">Pickup Time</span>
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-lg border border-gold/30 bg-white px-3 py-2 text-sm text-gray-900"
            value={toDatetimeLocalValue(form.pickup_time)}
            onChange={(e) => updateField("pickup_time", e.target.value)}
          />
          {displayPickup ? (
            <span className="mt-1 block text-xs text-maroon/60">Example: {displayPickup}</span>
          ) : null}
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-maroon">Notes</span>
          <textarea
            rows={2}
            className="mt-1 w-full rounded-lg border border-gold/30 bg-white px-3 py-2 text-sm text-gray-900"
            placeholder="Parcel handed over to rider."
            value={form.notes ?? ""}
            onChange={(e) => updateField("notes", e.target.value)}
          />
        </label>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() => void handleSave()}
        className="mt-4 rounded-xl border-2 border-maroon bg-maroon px-4 py-2 text-sm font-semibold text-white hover:bg-maroon-light disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save Rapido Delivery Details"}
      </button>
    </section>
  );
}
