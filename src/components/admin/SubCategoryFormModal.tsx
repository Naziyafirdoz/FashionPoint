"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { slugify } from "@/lib/product-filters";
import {
  SUB_CATEGORY_DESCRIPTION_MAX_LENGTH,
  type AdminSubCategoryRow
} from "@/lib/admin/sub-categories";
import type { Category } from "@/types";

export type SubCategoryFormValues = {
  category_id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  sort_order: string;
  is_active: boolean;
};

const EMPTY_FORM: SubCategoryFormValues = {
  category_id: "",
  name: "",
  slug: "",
  description: "",
  image_url: "",
  sort_order: "0",
  is_active: true
};

type SubCategoryFormModalProps = {
  open: boolean;
  title: string;
  categories: Category[];
  initial?: AdminSubCategoryRow | null;
  defaultCategoryId?: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: SubCategoryFormValues) => Promise<void>;
};

export function SubCategoryFormModal({
  open,
  title,
  categories,
  initial,
  defaultCategoryId,
  saving,
  onClose,
  onSubmit
}: SubCategoryFormModalProps) {
  const [form, setForm] = useState<SubCategoryFormValues>(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        category_id: initial.category_id,
        name: initial.name,
        slug: initial.slug,
        description: initial.description ?? "",
        image_url: initial.image_url ?? "",
        sort_order: String(initial.sort_order),
        is_active: initial.is_active
      });
      setSlugTouched(true);
    } else {
      setForm({
        ...EMPTY_FORM,
        category_id: defaultCategoryId ?? categories[0]?.id ?? ""
      });
      setSlugTouched(false);
    }
  }, [open, initial, defaultCategoryId, categories]);

  if (!open) return null;

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      slug: !slugTouched && !initial ? slugify(name) : f.slug
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close modal" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sub-category-modal-title"
        className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="sub-category-modal-title" className="font-display text-lg font-bold text-primary">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-blush" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await onSubmit(form);
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="sub-category-parent" className="mb-1 block text-sm font-semibold">
              Parent Category *
            </label>
            <select
              id="sub-category-parent"
              required
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.category_id}
              onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
            >
              <option value="" disabled>
                Select category
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="sub-category-name" className="mb-1 block text-sm font-semibold">
              Sub Category Name *
            </label>
            <input
              id="sub-category-name"
              required
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="sub-category-slug" className="mb-1 block text-sm font-semibold">
              Slug *
            </label>
            <input
              id="sub-category-slug"
              required
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
              }}
            />
          </div>

          <div>
            <label htmlFor="sub-category-description" className="mb-1 block text-sm font-semibold">
              Description
            </label>
            <textarea
              id="sub-category-description"
              rows={3}
              maxLength={SUB_CATEGORY_DESCRIPTION_MAX_LENGTH}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="sub-category-image" className="mb-1 block text-sm font-semibold">
              Image URL
            </label>
            <input
              id="sub-category-image"
              type="url"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.image_url}
              onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="sub-category-sort" className="mb-1 block text-sm font-semibold">
              Sort Order
            </label>
            <input
              id="sub-category-sort"
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
            Active
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-outline px-4 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary px-4 py-2 text-sm disabled:opacity-60">
              {saving ? "Saving…" : "Save Sub Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
