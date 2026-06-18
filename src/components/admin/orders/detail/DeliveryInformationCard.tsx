"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  formatDeliveryDetailsForCopy,
  resolveHouseFlat,
  resolveLandmark,
  resolvePrimaryPhone,
  resolveSecondaryPhone,
  resolveStreet,
  type ShippingAddressRecord
} from "@/lib/delivery/location";

type DeliveryInformationCardProps = {
  shippingAddress?: ShippingAddressRecord | null;
};

async function copyText(text: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch {
    toast.error("Could not copy to clipboard");
  }
}

export function DeliveryInformationCard({ shippingAddress }: DeliveryInformationCardProps) {
  const [copied, setCopied] = useState(false);

  const name = shippingAddress?.name ?? "—";
  const primaryPhone = resolvePrimaryPhone(shippingAddress) || "—";
  const secondaryPhone = resolveSecondaryPhone(shippingAddress);
  const email = shippingAddress?.email ?? "—";
  const houseFlat = resolveHouseFlat(shippingAddress) || "—";
  const street = resolveStreet(shippingAddress);
  const landmark = resolveLandmark(shippingAddress);
  const city = shippingAddress?.city ?? "—";
  const state = shippingAddress?.state ?? "—";
  const pincode = shippingAddress?.pincode ?? shippingAddress?.postal_code ?? "—";

  const primaryTel =
    primaryPhone !== "—" ? `tel:${primaryPhone.replace(/\D/g, "")}` : undefined;

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
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Delivery Information
      </h2>

      <dl className="mt-3 space-y-3 text-sm">
        <div>
          <dt className="text-gray-500">Customer Name</dt>
          <dd className="font-medium text-gray-900">{name}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Primary Mobile Number</dt>
          <dd className="text-gray-900">{primaryPhone}</dd>
        </div>
        {secondaryPhone ? (
          <div>
            <dt className="text-gray-500">Secondary Mobile Number</dt>
            <dd className="text-gray-900">{secondaryPhone}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-gray-500">Email</dt>
          <dd className="text-gray-900">{email}</dd>
        </div>
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

      <div className="mt-4 flex flex-wrap gap-2">
        {primaryTel ? (
          <a
            href={primaryTel}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Call Customer
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
        >
          {copied ? "Copied" : "Copy Delivery Details"}
        </button>
      </div>
    </section>
  );
}
