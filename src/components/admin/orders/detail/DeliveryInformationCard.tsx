"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { AdminDeliveryEstimate } from "@/components/admin/orders/detail/AdminDeliveryEstimate";
import {
  formatDeliveryDetailsForCopy,
  resolveHouseFlat,
  resolveLandmark,
  resolveStreet,
  type ShippingAddressRecord
} from "@/lib/delivery/location";
import type { Order } from "@/types";

type DeliveryInformationCardProps = {
  shippingAddress?: ShippingAddressRecord | null;
  order?: Pick<Order, "status" | "shipping_address" | "delivery_confirmed_at" | "otp_verified_at">;
};

async function copyText(text: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch {
    toast.error("Could not copy to clipboard");
  }
}

export function DeliveryInformationCard({ shippingAddress, order }: DeliveryInformationCardProps) {
  const [copied, setCopied] = useState(false);

  const houseFlat = resolveHouseFlat(shippingAddress) || "—";
  const street = resolveStreet(shippingAddress);
  const landmark = resolveLandmark(shippingAddress);
  const city = shippingAddress?.city ?? "—";
  const state = shippingAddress?.state ?? "—";
  const pincode = shippingAddress?.pincode ?? shippingAddress?.postal_code ?? "—";

  const handleCopy = async () => {
    const text = formatDeliveryDetailsForCopy(shippingAddress);
    if (!text) {
      toast.error("No delivery details to copy");
      return;
    }
    await copyText(text, "Delivery details copied");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="flex h-full min-h-[22rem] flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Delivery Information
      </h2>

      <dl className="mt-3 space-y-2.5 text-sm">
        <div>
          <dt className="text-gray-500">Door / House / Flat Number</dt>
          <dd className="text-gray-900">{houseFlat}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Street / Area</dt>
          <dd className="text-gray-900">{street || "—"}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Landmark</dt>
          <dd className="text-gray-900">{landmark || "—"}</dd>
        </div>
        <div>
          <dt className="text-gray-500">City</dt>
          <dd className="text-gray-900">{city}</dd>
        </div>
        <div>
          <dt className="text-gray-500">State</dt>
          <dd className="text-gray-900">{state}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Pincode</dt>
          <dd className="text-gray-900">{pincode}</dd>
        </div>
      </dl>

      {order ? <AdminDeliveryEstimate order={order} className="mt-3 text-xs text-gray-500" /> : null}

      <button
        type="button"
        onClick={() => void handleCopy()}
        className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
      >
        {copied ? "Copied" : "Copy Delivery Details"}
      </button>
    </section>
  );
}
