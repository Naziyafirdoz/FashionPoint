"use client";

import { useCallback, useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { customerName, customerPhone } from "@/lib/orders/admin-orders";
import {
  resolveHouseFlat,
  resolveStreet,
  type ShippingAddressRecord
} from "@/lib/delivery/location";
import { RapidoDeliveryDetailsForm } from "@/components/admin/orders/RapidoDeliveryDetailsForm";
import { siteConfig } from "@/lib/site-config";
import type { Order } from "@/types";

type RapidoGuideModalProps = {
  open: boolean;
  onClose: () => void;
  orderId: string;
  order: Order;
  storeName: string;
  onOrderUpdated?: (order: Order) => void;
};

type GuideStep = {
  number: number;
  shortTitle: string;
  title: string;
  description?: string;
  content?: ReactNode;
};

async function copyText(text: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch {
    toast.error("Could not copy to clipboard");
  }
}

function ExampleBlock({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 rounded-lg border border-gold/30 bg-white/90 px-3 py-2.5 text-sm text-maroon/90">
      {children}
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  if (!text.trim()) return null;
  return (
    <button
      type="button"
      onClick={() => void copyText(text, `${label} copied`)}
      className="mt-2 rounded-lg border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-semibold text-maroon hover:bg-gold/20"
    >
      Copy {label}
    </button>
  );
}

function buildDropToBlock(address?: ShippingAddressRecord | null): string {
  if (!address) return "";
  const area = resolveStreet(address) || address.city || "";
  const city = address.city ?? "";
  const state = address.state ?? "";
  const pincode = address.pincode ?? address.postal_code ?? "";
  return [area, city, state, pincode].filter(Boolean).join("\n");
}

export function RapidoGuideModal({
  open,
  onClose,
  orderId,
  order,
  storeName,
  onOrderUpdated
}: RapidoGuideModalProps) {
  const address = order.shipping_address;
  const dropToBlock = buildDropToBlock(address);
  const building = resolveHouseFlat(address);
  const name = customerName(order);
  const phone = customerPhone(order);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const steps: GuideStep[] = [
    {
      number: 1,
      shortTitle: "Open Rapido App",
      title: "Open the Rapido App",
      description: "Open Rapido app.\n\nSelect:\n\nParcel",
      content: (
        <ExampleBlock>
          <p className="font-semibold text-maroon">Select service</p>
          <p className="mt-1 text-maroon/80">Parcel</p>
        </ExampleBlock>
      )
    },
    {
      number: 2,
      shortTitle: "Pickup Location",
      title: "Open Rapido Parcel",
      description:
        "Pickup from current location.\n\nThis should be your shop location. Don't change it unless shipping from another location.",
      content: (
        <ExampleBlock>
          <p className="font-semibold text-maroon">{siteConfig.storeName}</p>
          <p className="mt-1">{siteConfig.address}</p>
          <p className="mt-1">Phone: {siteConfig.phone1}</p>
        </ExampleBlock>
      )
    },
    {
      number: 3,
      shortTitle: "Drop To",
      title: 'Tap "Drop To"',
      description: "Paste:\n\nArea\nCity\nState\nPincode",
      content: (
        <>
          <ExampleBlock>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {dropToBlock || "Area\nCity\nState\nPincode"}
            </pre>
          </ExampleBlock>
          <CopyButton text={dropToBlock} label="drop address" />
        </>
      )
    },
    {
      number: 4,
      shortTitle: "Add Delivery Details",
      title: "Add Delivery Details",
      description: "Fill:\n\nName *\nPhone Number *\nFloor / Door No / Building\n\nThen press:\n\nConfirm Drop Details",
      content: (
        <>
          <ExampleBlock>
            <p>
              <span className="font-semibold text-maroon">Name:</span>
              <br />
              {name}
            </p>
            <p className="mt-2">
              <span className="font-semibold text-maroon">Phone:</span>
              <br />
              {phone}
            </p>
            <p className="mt-2">
              <span className="font-semibold text-maroon">Building:</span>
              <br />
              {building || "—"}
            </p>
          </ExampleBlock>
          <CopyButton
            text={[name, phone, building].filter(Boolean).join("\n")}
            label="delivery details"
          />
        </>
      )
    },
    {
      number: 5,
      shortTitle: "Rider Pickup",
      title: "Rider Pickup",
      description: "Wait for Rapido rider.\n\nGive parcel to rider.\n\nDelivery starts."
    },
    {
      number: 6,
      shortTitle: "Mark Shipped",
      title: `Return to ${storeName}`,
      description:
        `After giving parcel to rider,\n\ncome back to ${storeName} admin panel and click:\n\n🚚 Mark Shipped`
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-maroon/60 backdrop-blur-[1px]"
        aria-label="Close guide"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rapido-guide-title"
        className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-gold/30 bg-white shadow-2xl md:max-h-[90vh] md:w-full md:max-w-[900px] md:rounded-2xl"
      >
        <div className="border-b border-gold/25 bg-gradient-to-r from-maroon to-maroon-light px-5 py-4 text-white md:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-light">
                Rapido Parcel
              </p>
              <h2 id="rapido-guide-title" className="mt-1 font-display text-xl font-bold">
                How to Book Rapido Parcel
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-white/80 hover:bg-white/10"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-5 md:px-6 md:py-6">
          <ol className="space-y-0">
            {steps.map((step, index) => (
              <li key={step.number} className="relative flex gap-4 pb-8 last:pb-0">
                {index < steps.length - 1 ? (
                  <span
                    className="absolute left-4 top-9 h-[calc(100%-1.25rem)] w-0.5 bg-gradient-to-b from-gold to-gold/20"
                    aria-hidden
                  />
                ) : null}

                <div className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-gold bg-maroon text-sm font-bold text-gold-light shadow-sm">
                  {step.number}
                </div>

                <div className="min-w-0 flex-1 rounded-xl border border-gold/25 bg-gradient-to-br from-white to-gold/5 p-4 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gold">
                    Step {step.number} · {step.shortTitle}
                  </p>
                  <h3 className="mt-1 text-base font-bold text-maroon">{step.title}</h3>
                  {step.description ? (
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-maroon/80">
                      {step.description}
                    </p>
                  ) : null}
                  {step.content}
                </div>
              </li>
            ))}
          </ol>

          <RapidoDeliveryDetailsForm
            orderId={orderId}
            order={order}
            onSaved={(updated) => onOrderUpdated?.(updated)}
          />
        </div>

        <div className="border-t border-gold/20 bg-white px-5 py-4 md:px-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-maroon px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-maroon-light"
          >
            Got it — return to order
          </button>
        </div>
      </div>
    </div>
  );
}
