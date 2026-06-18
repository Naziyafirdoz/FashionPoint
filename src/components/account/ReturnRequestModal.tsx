"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { RETURN_REASONS } from "@/lib/orders/returns";
import type { ReturnReason } from "@/types";

type ReturnRequestModalProps = {
  open: boolean;
  orderNumber: string;
  loading?: boolean;
  onConfirm: (payload: {
    reason: ReturnReason;
    notes: string;
    image_url?: string;
  }) => void;
  onCancel: () => void;
};

export function ReturnRequestModal({
  open,
  orderNumber,
  loading = false,
  onConfirm,
  onCancel
}: ReturnRequestModalProps) {
  const [reason, setReason] = useState<ReturnReason>("wrong_product");
  const [notes, setNotes] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("wrong_product");
      setNotes("");
      setImageUrl(undefined);
    }
  }, [open]);

  if (!open) return null;

  const handleImageChange = async (file: File | null) => {
    if (!file) {
      setImageUrl(undefined);
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/image", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Image upload failed");
        return;
      }
      setImageUrl(data.url);
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="font-bold text-primary">Request Return</h2>
        <p className="mt-1 text-sm text-foreground/60">Order {orderNumber}</p>

        <label className="mt-4 block text-sm">
          <span className="text-foreground/70">Return Reason</span>
          <select
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value as ReturnReason)}
          >
            {RETURN_REASONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block text-sm">
          <span className="text-foreground/70">Notes</span>
          <textarea
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe the issue (optional)"
          />
        </label>

        <label className="mt-3 block text-sm">
          <span className="text-foreground/70">Image (optional)</span>
          <input
            type="file"
            accept="image/*"
            className="mt-1 w-full text-sm"
            disabled={uploading || loading}
            onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
          />
          {uploading ? (
            <p className="mt-1 text-xs text-foreground/50">Uploading…</p>
          ) : imageUrl ? (
            <p className="mt-1 text-xs text-green-700">Image attached</p>
          ) : null}
        </label>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-lg border px-4 py-2 text-sm"
            disabled={loading || uploading}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary flex-1"
            disabled={loading || uploading}
            onClick={() => onConfirm({ reason, notes: notes.trim(), image_url: imageUrl })}
          >
            {loading ? "Submitting…" : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}
