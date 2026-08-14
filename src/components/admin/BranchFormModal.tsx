"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { slugify } from "@/lib/product-filters";
import type { BranchWithAreas } from "@/lib/shipping/branch-types";

export type BranchFormValues = {
  name: string;
  slug: string;
  city: string;
  state: string;
  pincode: string;
  address: string;
  phone: string;
  local_shipping_charge: string;
  outstation_shipping_charge: string;
  is_active: boolean;
  is_default: boolean;
  sort_order: string;
};

const EMPTY_FORM: BranchFormValues = {
  name: "",
  slug: "",
  city: "",
  state: "",
  pincode: "",
  address: "",
  phone: "",
  local_shipping_charge: "0",
  outstation_shipping_charge: "0",
  is_active: true,
  is_default: false,
  sort_order: "0"
};

type BranchFormModalProps = {
  open: boolean;
  title: string;
  initial?: BranchWithAreas | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: BranchFormValues) => Promise<void>;
};

export function BranchFormModal({
  open,
  title,
  initial,
  saving,
  onClose,
  onSubmit
}: BranchFormModalProps) {
  const [form, setForm] = useState<BranchFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name,
        slug: initial.slug,
        city: initial.city,
        state: initial.state,
        pincode: initial.pincode,
        address: initial.address ?? "",
        phone: initial.phone ?? "",
        local_shipping_charge: String(initial.local_shipping_charge),
        outstation_shipping_charge: String(initial.outstation_shipping_charge),
        is_active: initial.is_active,
        is_default: initial.is_default,
        sort_order: String(initial.sort_order)
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [initial, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.slug.trim()) newErrors.slug = "Slug is required";
    if (!form.city.trim()) newErrors.city = "City is required";

    if (form.local_shipping_charge) {
      const n = Number(form.local_shipping_charge);
      if (isNaN(n) || n < 0) newErrors.local_shipping_charge = "Must be non-negative";
    }

    if (form.outstation_shipping_charge) {
      const n = Number(form.outstation_shipping_charge);
      if (isNaN(n) || n < 0) newErrors.outstation_shipping_charge = "Must be non-negative";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onSubmit(form);
      setForm(EMPTY_FORM);
      setErrors({});
    } catch {
      // Error handled by parent
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="card-store w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white/95 backdrop-blur flex items-center justify-between gap-4 border-b pb-4 mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-foreground/60 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name & Slug */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">
                Branch Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name: val,
                    slug: !initial ? slugify(val) : f.slug
                  }));
                  if (errors.name) setErrors((e) => ({ ...e, name: "" }));
                }}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${
                  errors.name ? "border-red-500" : ""
                }`}
                placeholder="e.g., Bangalore"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Slug <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => {
                  setForm((f) => ({ ...f, slug: e.target.value }));
                  if (errors.slug) setErrors((e) => ({ ...e, slug: "" }));
                }}
                className={`w-full rounded-lg border px-3 py-2 text-sm font-mono ${
                  errors.slug ? "border-red-500" : ""
                }`}
                placeholder="e.g., bangalore"
              />
              {errors.slug && <p className="text-xs text-red-500 mt-1">{errors.slug}</p>}
            </div>
          </div>

          {/* City & State */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => {
                  setForm((f) => ({ ...f, city: e.target.value }));
                  if (errors.city) setErrors((e) => ({ ...e, city: "" }));
                }}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${
                  errors.city ? "border-red-500" : ""
                }`}
                placeholder="e.g., Bangalore"
              />
              {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">State</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="e.g., Karnataka"
              />
            </div>
          </div>

          {/* Pincode & Phone */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">Pincode</label>
              <input
                type="text"
                value={form.pincode}
                onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="e.g., 560001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="+91 XXXXX XXXXX"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium mb-2">Address</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              rows={3}
              placeholder="Branch address"
            />
          </div>

          {/* Shipping Charges */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Shipping Charges (₹)</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Local Delivery</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.local_shipping_charge}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, local_shipping_charge: e.target.value }));
                    if (errors.local_shipping_charge)
                      setErrors((e) => ({ ...e, local_shipping_charge: "" }));
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${
                    errors.local_shipping_charge ? "border-red-500" : ""
                  }`}
                />
                {errors.local_shipping_charge && (
                  <p className="text-xs text-red-500 mt-1">{errors.local_shipping_charge}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Outstation Delivery</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.outstation_shipping_charge}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, outstation_shipping_charge: e.target.value }));
                    if (errors.outstation_shipping_charge)
                      setErrors((e) => ({ ...e, outstation_shipping_charge: "" }));
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${
                    errors.outstation_shipping_charge ? "border-red-500" : ""
                  }`}
                />
                {errors.outstation_shipping_charge && (
                  <p className="text-xs text-red-500 mt-1">{errors.outstation_shipping_charge}</p>
                )}
              </div>
            </div>
          </div>

          {/* Status & Sort */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
                Active
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_default"
                checked={form.is_default}
                onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="is_default" className="text-sm font-medium cursor-pointer">
                Default Branch
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Sort Order</label>
              <input
                type="number"
                min="0"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end border-t pt-4 sticky bottom-0 bg-white/95">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-foreground/5 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Branch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
