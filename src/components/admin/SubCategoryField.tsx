"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { slugify } from "@/lib/product-filters";
import {
  buildInlineSubCategoryPayload,
  EMPTY_INLINE_SUB_CATEGORY_FORM,
  getInlineSubCategoryValidationError,
  normalizeClientSubCategories,
  SUB_CATEGORY_DESCRIPTION_MAX_LENGTH,
  type InlineSubCategoryFormValues
} from "@/lib/admin/sub-categories";
import { dedupeSelectOptions } from "@/lib/admin/select-options";
import type { SubCategory } from "@/types";

type SubCategoryFieldProps = {
  categoryId: string;
  value: string;
  onChange: (subCategoryId: string) => void;
};

type FieldMode = "select" | "add";

function mapCreatedSubCategory(raw: Record<string, unknown>, categoryId: string): SubCategory {
  return {
    id: String(raw.id),
    category_id: String(raw.category_id ?? categoryId),
    name: String(raw.name),
    slug: String(raw.slug),
    description: raw.description != null ? String(raw.description) : null,
    image_url: raw.image_url != null ? String(raw.image_url) : null,
    sort_order: Number(raw.sort_order ?? 0),
    is_active: Boolean(raw.is_active ?? true)
  };
}

export function SubCategoryField({ categoryId, value, onChange }: SubCategoryFieldProps) {
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<FieldMode>("select");
  const [inlineForm, setInlineForm] = useState<InlineSubCategoryFormValues>(EMPTY_INLINE_SUB_CATEGORY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [creating, setCreating] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const loadSubCategories = useCallback(async (nextCategoryId: string) => {
    if (!nextCategoryId) {
      setSubCategories([]);
      return [];
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/sub-categories?category_id=${encodeURIComponent(nextCategoryId)}`);
      if (!res.ok) throw new Error("Failed to load");
      const data: { sub_categories?: unknown } = await res.json();
      const list = normalizeClientSubCategories(data.sub_categories);
      setSubCategories(list);
      return list;
    } catch {
      setSubCategories([]);
      toast.error("Could not load sub categories");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await loadSubCategories(categoryId);
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, [categoryId, loadSubCategories]);

  useEffect(() => {
    if (!categoryId || !value || subCategories.length === 0) return;
    if (!subCategories.some((item) => item.id === value)) {
      onChangeRef.current("");
    }
  }, [categoryId, subCategories, value]);

  const handleModeChange = (nextMode: FieldMode) => {
    if (nextMode === "add") {
      setInlineForm(EMPTY_INLINE_SUB_CATEGORY_FORM);
      setSlugTouched(false);
    }
    setMode(nextMode);
  };

  const handleCancelAdd = () => {
    setInlineForm(EMPTY_INLINE_SUB_CATEGORY_FORM);
    setSlugTouched(false);
    setMode("select");
  };

  const handleNameChange = (name: string) => {
    setInlineForm((current) => ({
      ...current,
      name,
      slug: !slugTouched ? slugify(name) : current.slug
    }));
  };

  const handleCreateAndSelect = async () => {
    if (!categoryId) {
      toast.error("Select a category first");
      return;
    }

    const validationError = getInlineSubCategoryValidationError(inlineForm, subCategories);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const payload = buildInlineSubCategoryPayload(categoryId, inlineForm);
    setCreating(true);
    try {
      const res = await fetch("/api/admin/sub-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create sub category");
        return;
      }

      const created = mapCreatedSubCategory(data.sub_category as Record<string, unknown>, categoryId);
      const list = await loadSubCategories(categoryId);
      const next = dedupeSelectOptions(
        list.some((item) => item.id === created.id) ? list : [...list, created]
      );
      setSubCategories(next);
      onChange(created.id);
      setInlineForm(EMPTY_INLINE_SUB_CATEGORY_FORM);
      setSlugTouched(false);
      setMode("select");
      toast.success(`Sub category "${created.name}" created`);
    } catch {
      toast.error("Failed to create sub category");
    } finally {
      setCreating(false);
    }
  };

  if (!categoryId) {
    return <p className="text-sm text-foreground/60">Select a category first.</p>;
  }

  if (loading && subCategories.length === 0 && mode === "select") {
    return <p className="text-sm text-foreground/60">Loading sub categories…</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleModeChange("select")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            mode === "select" ? "bg-primary text-white" : "border text-foreground/70"
          }`}
        >
          Select Existing
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("add")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            mode === "add" ? "bg-primary text-white" : "border text-foreground/70"
          }`}
        >
          Add New
        </button>
      </div>

      {mode === "select" ? (
        subCategories.length === 0 ? (
          <div className="space-y-2">
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              No sub categories yet. Switch to &quot;Add New&quot; to create one.
            </p>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value=""
              onChange={(e) => onChange(e.target.value)}
            >
              <option value="">None</option>
            </select>
          </div>
        ) : (
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={subCategories.some((item) => item.id === value) ? value : ""}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">None</option>
            {subCategories.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        )
      ) : (
        <div className="space-y-3 rounded-lg border border-accent/20 bg-blush/10 p-4">
          <div>
            <label htmlFor="inline-sub-category-name" className="mb-1 block text-sm font-semibold">
              Sub Category Name *
            </label>
            <input
              id="inline-sub-category-name"
              type="text"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={inlineForm.name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="inline-sub-category-slug" className="mb-1 block text-sm font-semibold">
              Slug *
            </label>
            <input
              id="inline-sub-category-slug"
              type="text"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={inlineForm.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setInlineForm((current) => ({ ...current, slug: slugify(e.target.value) }));
              }}
            />
          </div>

          <div>
            <label htmlFor="inline-sub-category-description" className="mb-1 block text-sm font-semibold">
              Description
            </label>
            <textarea
              id="inline-sub-category-description"
              rows={3}
              maxLength={SUB_CATEGORY_DESCRIPTION_MAX_LENGTH}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={inlineForm.description}
              onChange={(e) => setInlineForm((current) => ({ ...current, description: e.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="inline-sub-category-image" className="mb-1 block text-sm font-semibold">
              Image URL (optional)
            </label>
            <input
              id="inline-sub-category-image"
              type="url"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={inlineForm.image_url}
              onChange={(e) => setInlineForm((current) => ({ ...current, image_url: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={handleCancelAdd} className="btn-outline px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleCreateAndSelect()}
              disabled={creating}
              className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
            >
              {creating ? "Creating…" : "Create & Select"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
