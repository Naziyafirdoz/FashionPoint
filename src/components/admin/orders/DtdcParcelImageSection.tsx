"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { DTDC_MAX_UPLOAD_BYTES } from "@/lib/orders/dtdc-parcel-image";
import { getDtdcParcelDetails } from "@/lib/orders/dtdc-parcel-metadata";
import type { Order } from "@/types";

type DtdcParcelImageSectionProps = {
  orderId: string;
  order: Pick<Order, "shipping_address">;
  disabled?: boolean;
  onSaved?: (order: Order) => void;
};

const ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

export function DtdcParcelImageSection({
  orderId,
  order,
  disabled,
  onSaved
}: DtdcParcelImageSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);

  const saved = getDtdcParcelDetails(order);
  const previewUrl = pendingPreviewUrl ?? saved?.image_url ?? null;

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    };
  }, [pendingPreviewUrl]);

  const clearPending = () => {
    setPendingFile(null);
    setPendingPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();
    const allowedType =
      type === "image/jpeg" ||
      type === "image/jpg" ||
      type === "image/png" ||
      type === "image/webp" ||
      /\.(jpe?g|png|webp)$/.test(name);

    if (!allowedType || type === "image/gif" || type === "image/svg+xml" || type === "application/pdf") {
      toast.error("DTDC parcel image must be a JPEG, PNG, or WebP file.");
      clearPending();
      return;
    }

    if (file.size > DTDC_MAX_UPLOAD_BYTES) {
      toast.error("DTDC parcel image must be 10 MB or smaller.");
      clearPending();
      return;
    }

    setPendingPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setPendingFile(file);
  };

  const handleSave = async () => {
    if (!pendingFile) {
      toast.error("Please choose a DTDC parcel image to upload.");
      return;
    }

    setSaving(true);
    try {
      const form = new FormData();
      form.append("file", pendingFile);
      const res = await fetch(`/api/orders/${orderId}/dtdc-parcel-image`, {
        method: "POST",
        credentials: "include",
        body: form
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Unable to save DTDC parcel image");
        return;
      }
      toast.success(data.message ?? "DTDC parcel image saved");
      clearPending();
      if (data.order) onSaved?.(data.order as Order);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border-2 border-gold/35 bg-gradient-to-br from-white to-gold/5 p-4 shadow-sm md:p-5">
      <h3 className="font-display text-lg font-bold text-maroon">DTDC Delivery</h3>
      <p className="mt-1 text-sm text-maroon/70">
        Upload a photo of the handwritten DTDC parcel / shipping information. This image is sent to the
        customer in the shipped email.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />

      {previewUrl ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-gold/30 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="DTDC parcel shipping information"
            className="mx-auto max-h-[420px] w-full object-contain"
          />
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-gold/40 bg-white/70 px-4 py-8 text-center text-sm text-maroon/60">
          No DTDC parcel image selected yet.
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || saving}
          onClick={() => inputRef.current?.click()}
          className="rounded-xl border-2 border-gold bg-white px-4 py-2 text-sm font-semibold text-maroon shadow-sm hover:bg-gold/10 disabled:opacity-50"
        >
          {previewUrl ? "Replace Image" : "Upload Parcel Image"}
        </button>
        {pendingFile ? (
          <button
            type="button"
            disabled={disabled || saving}
            onClick={clearPending}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Remove
          </button>
        ) : null}
        <button
          type="button"
          disabled={disabled || saving || !pendingFile}
          onClick={() => void handleSave()}
          className="rounded-xl border-2 border-maroon bg-maroon px-4 py-2 text-sm font-semibold text-white hover:bg-maroon-light disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save DTDC Image"}
        </button>
      </div>
    </section>
  );
}
