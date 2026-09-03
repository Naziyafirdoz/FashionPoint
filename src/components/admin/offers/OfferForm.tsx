"use client";

import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import { OfferCategoryPicker } from "@/components/admin/offers/OfferCategoryPicker";
import { OfferProductPicker } from "@/components/admin/offers/OfferProductPicker";
import type { AdminOfferDto } from "@/lib/admin/offers";
import type { OfferDiscountType, OfferScope } from "@/lib/offers/types";

const sectionCardClass =
  "min-w-0 w-full rounded-xl border border-accent/30 bg-white p-5 shadow-card sm:p-6";

export type OfferScheduleType = "limited" | "ongoing";

export type OfferUpsertPayload = {
  name: string;
  description: string | null;
  discountType: OfferDiscountType;
  discountValue: number;
  scope: OfferScope;
  scheduleType: OfferScheduleType;
  startsAt: string | null;
  endsAt: string | null;
  isEnabled: boolean;
  productIds: string[];
  categoryIds: string[];
};

type OfferFormProps = {
  mode: "create" | "edit";
  initial?: AdminOfferDto | null;
  saving: boolean;
  onSubmit: (payload: OfferUpsertPayload) => Promise<void>;
};

function toDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function datetimeLocalToIso(value: string): string {
  return new Date(value).toISOString();
}

function validateOfferForm(input: {
  name: string;
  discountType: OfferDiscountType;
  discountValue: number;
  scheduleType: OfferScheduleType;
  startsAtLocal: string;
  endsAtLocal: string;
  scope: OfferScope;
  productIds: string[];
  categoryIds: string[];
}): string | null {
  if (!input.name.trim()) return "Name is required";
  if (input.discountType !== "percentage" && input.discountType !== "fixed_amount") {
    return "Discount type must be percentage or fixed_amount";
  }
  if (!Number.isFinite(input.discountValue) || input.discountValue <= 0) {
    return "Discount value must be greater than 0";
  }
  if (input.discountType === "percentage" && input.discountValue > 100) {
    return "Percentage discount cannot be greater than 100";
  }

  if (input.scheduleType === "limited") {
    if (!input.startsAtLocal) return "Starts At is required";
    if (!input.endsAtLocal) return "Ends At is required";
    const startsAt = new Date(input.startsAtLocal);
    const endsAt = new Date(input.endsAtLocal);
    if (Number.isNaN(startsAt.getTime())) return "Starts At must be a valid date";
    if (Number.isNaN(endsAt.getTime())) return "Ends At must be a valid date";
    if (endsAt.getTime() <= startsAt.getTime()) return "endsAt must be later than startsAt";
  } else if (input.scheduleType === "ongoing") {
    if (input.startsAtLocal) {
      const startsAt = new Date(input.startsAtLocal);
      if (Number.isNaN(startsAt.getTime())) return "Starts At must be a valid date";
    }
  } else {
    return "Schedule type must be limited or ongoing";
  }

  if (input.scope === "product") {
    if (input.productIds.length === 0) return "Select at least one product for a product offer";
  } else if (input.scope === "category") {
    if (input.categoryIds.length === 0) return "Select at least one category for a category offer";
  } else {
    return "Scope must be product or category";
  }

  return null;
}

export function OfferForm({ mode, initial, saving, onSubmit }: OfferFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [discountType, setDiscountType] = useState<OfferDiscountType>(
    initial?.discountType ?? "percentage"
  );
  const [discountValue, setDiscountValue] = useState(
    initial?.discountValue != null ? String(initial.discountValue) : ""
  );
  const [startsAtLocal, setStartsAtLocal] = useState(toDatetimeLocalValue(initial?.startsAt));
  const [endsAtLocal, setEndsAtLocal] = useState(toDatetimeLocalValue(initial?.endsAt));
  const [scheduleType, setScheduleType] = useState<OfferScheduleType>(
    mode === "edit" && !initial?.endsAt ? "ongoing" : "limited"
  );
  const [scope, setScope] = useState<OfferScope>(initial?.scope ?? "product");
  const [productIds, setProductIds] = useState<string[]>(initial?.productIds ?? []);
  const [categoryIds, setCategoryIds] = useState<string[]>(initial?.categoryIds ?? []);
  const [isEnabled, setIsEnabled] = useState(initial?.isEnabled === true);

  const handleScopeChange = (next: OfferScope) => {
    setScope(next);
    if (next === "product") {
      setCategoryIds([]);
    } else {
      setProductIds([]);
    }
  };

  const handleScheduleTypeChange = (next: OfferScheduleType) => {
    setScheduleType(next);
    if (next === "ongoing") {
      setEndsAtLocal("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const value = Number(discountValue);
    const error = validateOfferForm({
      name,
      discountType,
      discountValue: value,
      scheduleType,
      startsAtLocal,
      endsAtLocal,
      scope,
      productIds,
      categoryIds
    });
    if (error) {
      toast.error(error);
      return;
    }

    const payload: OfferUpsertPayload = {
      name: name.trim(),
      description: description.trim() || null,
      discountType,
      discountValue: value,
      scope,
      scheduleType,
      startsAt: startsAtLocal ? datetimeLocalToIso(startsAtLocal) : null,
      endsAt: scheduleType === "ongoing" ? null : datetimeLocalToIso(endsAtLocal),
      isEnabled,
      productIds: scope === "product" ? productIds : [],
      categoryIds: scope === "category" ? categoryIds : []
    };

    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl flex-col gap-6">
      <section className={`${sectionCardClass} space-y-4`}>
        <h2 className="font-semibold text-primary">Offer Details</h2>
        <div>
          <label htmlFor="offer-name" className="mb-1 block text-sm font-semibold">
            Name *
          </label>
          <input
            id="offer-name"
            required
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Diwali 20%"
            disabled={saving}
          />
        </div>
        <div>
          <label htmlFor="offer-description" className="mb-1 block text-sm font-semibold">
            Description
          </label>
          <textarea
            id="offer-description"
            rows={3}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional details for this festival offer"
            disabled={saving}
          />
        </div>
      </section>

      <section className={`${sectionCardClass} space-y-4`}>
        <h2 className="font-semibold text-primary">Discount</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="offer-discount-type" className="mb-1 block text-sm font-semibold">
              Discount type *
            </label>
            <select
              id="offer-discount-type"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as OfferDiscountType)}
              disabled={saving}
            >
              <option value="percentage">Percentage</option>
              <option value="fixed_amount">Fixed amount</option>
            </select>
          </div>
          <div>
            <label htmlFor="offer-discount-value" className="mb-1 block text-sm font-semibold">
              Discount value *
            </label>
            <div className="relative">
              {discountType === "fixed_amount" ? (
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground/50">
                  ₹
                </span>
              ) : null}
              <input
                id="offer-discount-value"
                required
                type="number"
                min={0.01}
                step="any"
                max={discountType === "percentage" ? 100 : undefined}
                className={`w-full rounded-lg border py-2 text-sm ${
                  discountType === "fixed_amount" ? "pl-7 pr-3" : "px-3 pr-8"
                }`}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                disabled={saving}
              />
              {discountType === "percentage" ? (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-foreground/50">
                  %
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className={`${sectionCardClass} space-y-4`}>
        <h2 className="font-semibold text-primary">Schedule</h2>
        <div>
          <p className="mb-2 text-sm font-semibold">Schedule type *</p>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="offer-schedule-type"
                value="limited"
                checked={scheduleType === "limited"}
                onChange={() => handleScheduleTypeChange("limited")}
                disabled={saving}
              />
              Limited Time
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="offer-schedule-type"
                value="ongoing"
                checked={scheduleType === "ongoing"}
                onChange={() => handleScheduleTypeChange("ongoing")}
                disabled={saving}
              />
              Ongoing
            </label>
          </div>
        </div>
        <div className={`grid gap-4 ${scheduleType === "limited" ? "sm:grid-cols-2" : ""}`}>
          <div>
            <label htmlFor="offer-starts-at" className="mb-1 block text-sm font-semibold">
              {scheduleType === "limited" ? "Starts At *" : "Starts At (Optional)"}
            </label>
            <input
              id="offer-starts-at"
              required={scheduleType === "limited"}
              type="datetime-local"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={startsAtLocal}
              onChange={(e) => setStartsAtLocal(e.target.value)}
              disabled={saving}
            />
          </div>
          {scheduleType === "limited" ? (
            <div>
              <label htmlFor="offer-ends-at" className="mb-1 block text-sm font-semibold">
                Ends At *
              </label>
              <input
                id="offer-ends-at"
                required
                type="datetime-local"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={endsAtLocal}
                onChange={(e) => setEndsAtLocal(e.target.value)}
                disabled={saving}
              />
            </div>
          ) : null}
        </div>
      </section>

      <section className={`${sectionCardClass} space-y-4`}>
        <h2 className="font-semibold text-primary">Targeting</h2>
        <div>
          <p className="mb-2 text-sm font-semibold">Scope *</p>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="offer-scope"
                value="product"
                checked={scope === "product"}
                onChange={() => handleScopeChange("product")}
                disabled={saving}
              />
              Product
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="offer-scope"
                value="category"
                checked={scope === "category"}
                onChange={() => handleScopeChange("category")}
                disabled={saving}
              />
              Category
            </label>
          </div>
        </div>

        {scope === "product" ? (
          <OfferProductPicker selectedIds={productIds} onChange={setProductIds} disabled={saving} />
        ) : (
          <OfferCategoryPicker
            selectedIds={categoryIds}
            onChange={setCategoryIds}
            disabled={saving}
          />
        )}
      </section>

      <section className={sectionCardClass}>
        <label htmlFor="offer-enabled" className="flex cursor-pointer items-start gap-3">
          <span className="relative mt-0.5 inline-flex shrink-0">
            <input
              id="offer-enabled"
              type="checkbox"
              className="peer sr-only"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              disabled={saving}
            />
            <span
              className="block h-6 w-11 rounded-full bg-gray-200 transition-colors peer-checked:bg-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
              aria-hidden="true"
            />
            <span
              className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"
              aria-hidden="true"
            />
          </span>
          <span>
            <span className="block text-sm font-semibold">Enable this offer</span>
            <span className="mt-0.5 block text-xs text-foreground/50">
              Disabled offers stay off even if the schedule has started.
            </span>
          </span>
        </label>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href="/admin/offers" className="btn-outline px-4 py-2 text-center text-sm">
          Cancel
        </Link>
        <button type="submit" disabled={saving} className="btn-primary px-4 py-2 text-sm disabled:opacity-60">
          {saving ? "Saving…" : mode === "create" ? "Create Offer" : "Save Offer"}
        </button>
      </div>
    </form>
  );
}
