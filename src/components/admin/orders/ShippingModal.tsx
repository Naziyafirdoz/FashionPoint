"use client";

import { useEffect, useState } from "react";

type ShippingModalProps = {
  open: boolean;
  orderNumber: string;
  initialTracking?: string;
  initialCourier?: string;
  autoBooked?: boolean;
  onConfirm: (payload: {
    tracking_number: string;
    courier_partner: string;
    shipping_date: string;
  }) => void;
  onCancel: () => void;
  loading?: boolean;
};

export function ShippingModal({
  open,
  orderNumber,
  initialTracking = "",
  initialCourier = "",
  autoBooked = false,
  onConfirm,
  onCancel,
  loading = false
}: ShippingModalProps) {
  const [tracking, setTracking] = useState(initialTracking);
  const [courier, setCourier] = useState(initialCourier);
  const [shippingDate, setShippingDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  useEffect(() => {
    if (open) {
      setTracking(initialTracking);
      setCourier(initialCourier);
      setShippingDate(new Date().toISOString().slice(0, 10));
    }
  }, [open, initialTracking, initialCourier]);

  if (!open) return null;

  const canDispatch = Boolean(tracking.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="font-bold text-primary">Dispatch Order</h2>
        <p className="mt-1 text-sm text-foreground/60">
          {autoBooked
            ? `Parcel for ${orderNumber} was auto-booked with the delivery partner. Confirm dispatch to mark Out For Delivery.`
            : `Confirm shipping for ${orderNumber}. Status will update to Out For Delivery.`}
        </p>

        {autoBooked ? (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-900">
            Pickup and delivery addresses were sent to the courier automatically when the order was
            placed. No manual address entry is required.
          </div>
        ) : null}

        <label className="mt-4 block text-sm">
          <span className="text-foreground/70">Delivery Partner</span>
          <input
            type="text"
            className="mt-1 w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm"
            placeholder="Rapido Parcel"
            value={courier}
            readOnly={autoBooked && Boolean(initialCourier)}
            onChange={(e) => setCourier(e.target.value)}
          />
        </label>
        <label className="mt-3 block text-sm">
          <span className="text-foreground/70">Tracking Number</span>
          <input
            type="text"
            className="mt-1 w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm"
            placeholder="Auto-generated when parcel is booked"
            value={tracking}
            readOnly={autoBooked && Boolean(initialTracking)}
            onChange={(e) => setTracking(e.target.value)}
          />
        </label>
        <label className="mt-3 block text-sm">
          <span className="text-foreground/70">Shipping Date</span>
          <input
            type="date"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            value={shippingDate}
            onChange={(e) => setShippingDate(e.target.value)}
          />
        </label>
        <div className="mt-4 flex gap-2">
          <button type="button" className="flex-1 rounded-lg border px-4 py-2 text-sm" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary flex-1"
            disabled={loading || !canDispatch}
            onClick={() =>
              onConfirm({
                tracking_number: tracking.trim(),
                courier_partner: courier.trim(),
                shipping_date: shippingDate
              })
            }
          >
            {loading ? "Dispatching…" : "Confirm Dispatch"}
          </button>
        </div>
      </div>
    </div>
  );
}
