"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { formatOrderDateTime } from "@/lib/orders/admin-orders";
import {
  formatAdminDeliveredText,
  resolveAdminDeliveryDisplay
} from "@/lib/orders/admin-delivery-display";
import { deliveryStatusLabel } from "@/lib/shipping/delivery-status";
import { resolveOrderCourierName } from "@/lib/orders/rapido-delivery-metadata";
import { orderStatusLabel } from "@/lib/orders/status-config";
import type { Order } from "@/types";

type ShippingCardProps = {
  order: Order;
  deliveryOtp?: string;
  showOtpInput?: boolean;
  otpValue?: string;
  onOtpChange?: (value: string) => void;
  onVerifyOtp?: () => void;
  verifying?: boolean;
};

function trackShipmentUrl(courier: string, awb: string): string | null {
  const c = courier.toLowerCase();
  if (c.includes("rapido")) {
    return `https://www.google.com/search?q=${encodeURIComponent(`Rapido tracking ${awb}`)}`;
  }
  if (c.includes("blue dart") || c.includes("bluedart")) {
    return `https://www.bluedart.com/web/guest/trackdartresult?trackFor=0&trackNo=${encodeURIComponent(awb)}`;
  }
  if (c.includes("delhivery")) {
    return `https://www.delhivery.com/track/package/${encodeURIComponent(awb)}`;
  }
  if (c.includes("dtdc")) {
    return `https://www.dtdc.in/tracking.asp?strCnno=${encodeURIComponent(awb)}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(`${courier} tracking ${awb}`)}`;
}

export function ShippingCard({
  order,
  deliveryOtp,
  showOtpInput,
  otpValue = "",
  onOtpChange,
  onVerifyOtp,
  verifying
}: ShippingCardProps) {
  const [copied, setCopied] = useState(false);
  const tracking =
    order.tracking_number?.trim() || order.tracking_id?.trim() || "";
  const courier = resolveOrderCourierName(order);
  const deliveryStatus = deliveryStatusLabel(order.delivery_status ?? order.status);
  const deliveryDisplay = resolveAdminDeliveryDisplay(order);
  const trackUrl = tracking && courier ? trackShipmentUrl(courier, tracking) : null;

  const copyTracking = async () => {
    if (!tracking) return;
    try {
      await navigator.clipboard.writeText(tracking);
      setCopied(true);
      toast.success("AWB copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Shipping Information
      </h2>
      <p className="mt-2 text-sm text-gray-700">
        <span className="font-medium">Delivery status:</span> {deliveryStatus}
      </p>
      {order.shipment_id ? (
        <p className="mt-1 text-xs text-gray-500">Shipment ID: {order.shipment_id}</p>
      ) : null}

      {tracking ? (
        <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50/80 p-4">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Courier:</span> {courier || "—"}
          </p>
          <p className="mt-1 text-sm text-gray-700">
            <span className="font-medium">AWB:</span>{" "}
            <span className="font-mono">{tracking}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyTracking}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {copied ? "Copied" : "Copy AWB"}
            </button>
            {trackUrl ? (
              <a
                href={trackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90"
              >
                Track Shipment
              </a>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-gray-500">No tracking information yet.</p>
      )}

      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-gray-500">Courier Name</dt>
          <dd className="mt-0.5 font-medium text-gray-900">{courier || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Tracking ID</dt>
          <dd className="mt-0.5 font-mono text-sm text-gray-900">{tracking || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Shipping Date</dt>
          <dd className="mt-0.5 text-gray-900">
            {order.shipping_date ? formatOrderDateTime(order.shipping_date) : "—"}
          </dd>
        </div>
        {deliveryDisplay.kind === "vijayawada_estimate" ? (
          <div>
            <dt className="text-xs text-gray-500">Estimated Delivery</dt>
            <dd className="mt-0.5 text-gray-900">{deliveryDisplay.label}</dd>
          </div>
        ) : null}
        {deliveryDisplay.kind === "delivered" ? (
          <div>
            <dt className="text-xs text-gray-500">Delivered</dt>
            <dd className="mt-0.5 text-gray-900">{formatAdminDeliveredText(deliveryDisplay)}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs text-gray-500">Shipment Status</dt>
          <dd className="mt-0.5 text-gray-900">{orderStatusLabel(order.status)}</dd>
        </div>
        {deliveryOtp ? (
          <div>
            <dt className="text-xs text-gray-500">Delivery OTP</dt>
            <dd className="mt-0.5 font-mono font-semibold text-gray-900">{deliveryOtp}</dd>
          </div>
        ) : null}
      </dl>

      {showOtpInput ? (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="mb-2 text-xs text-gray-500">Verify delivery OTP</p>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Enter OTP"
              value={otpValue}
              onChange={(e) => onOtpChange?.(e.target.value)}
            />
            <button
              type="button"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={verifying}
              onClick={onVerifyOtp}
            >
              Verify
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
