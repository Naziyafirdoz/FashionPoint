"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { slugify } from "@/lib/product-filters";
import {
  CATEGORY_DESCRIPTION_MAX_LENGTH,
  type AdminCategoryRow
} from "@/lib/admin/categories";
export type CategoryFormValues = {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  sort_order: string;
  is_active: boolean;
};

const EMPTY_FORM: CategoryFormValues = {
  name: "",
  slug: "",
  description: "",
  image_url: "",
  sort_order: "0",
  is_active: true
};

type CategoryFormModalProps = {
  open: boolean;
  title: string;
  initial?: AdminCategoryRow | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: CategoryFormValues) => Promise<void>;
};

export function CategoryFormModal({
  open,
  title,
  initial,
  saving,
  onClose,
  onSubmit
}: CategoryFormModalProps) {
  const [form, setForm] = useState<CategoryFormValues>(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name,
        slug: initial.slug,
        description: initial.description ?? "",
        image_url: initial.image_url ?? "",
        sort_order: String(initial.sort_order),
        is_active: initial.is_active
      });
      setSlugTouched(true);
    } else {
      setForm(EMPTY_FORM);
      setSlugTouched(false);
    }
  }, [open, initial]);

  if (!open) return null;

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      slug: !slugTouched && !initial ? slugify(name) : f.slug
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-modal-title"
        className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="category-modal-title" className="font-display text-lg font-bold text-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 hover:bg-blush"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="category-name" className="mb-1 block text-sm font-semibold">
              Name *
            </label>
            <input
              id="category-name"
              required
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Designer Wear Blouses"
            />
          </div>

          <div>
            <label htmlFor="category-slug" className="mb-1 block text-sm font-semibold">
              Slug *
            </label>
            <input
              id="category-slug"
              required
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
              }}
              placeholder="designer-wear"
            />
          </div>

          <div>
            <label htmlFor="category-description" className="mb-1 block text-sm font-semibold">
              Description
            </label>
            <textarea
              id="category-description"
              rows={3}
              maxLength={CATEGORY_DESCRIPTION_MAX_LENGTH}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional category description"
            />
            <p className="mt-1 text-xs text-foreground/50">
              Optional. Max {CATEGORY_DESCRIPTION_MAX_LENGTH} characters.
            </p>          </div>

          <div>
            <label htmlFor="category-image" className="mb-1 block text-sm font-semibold">
              Image URL
            </label>
            <input
              id="category-image"
              type="url"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.image_url}
              onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div>
            <label htmlFor="category-sort" className="mb-1 block text-sm font-semibold">
              Sort order
            </label>
            <input
              id="category-sort"
              type="number"
              min={0}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            Active (visible in store)
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-outline px-4 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary px-4 py-2 text-sm disabled:opacity-60">
              {saving ? "Saving…" : "Save Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
