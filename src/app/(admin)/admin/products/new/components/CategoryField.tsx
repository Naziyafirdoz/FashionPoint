"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import type { Category } from "@/types";
import { slugify } from "@/lib/product-filters";
import { normalizeClientCategories } from "@/lib/categories/normalize-client-categories";
import { dedupeSelectOptions, sortBySortOrderThenName } from "@/lib/admin/select-options";

type CategoryFieldProps = {
  value: string;
  onChange: (categoryId: string) => void;
};

export function CategoryField({ value, onChange }: CategoryFieldProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"select" | "custom">("select");
  const [customName, setCustomName] = useState("");
  const [creating, setCreating] = useState(false);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  onChangeRef.current = onChange;
  valueRef.current = value;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/categories");
        if (!res.ok) throw new Error("Failed to load");
        const data: unknown = await res.json();
        if (cancelled) return;
        const payload = data as { categories?: unknown } | null;
        const list = normalizeClientCategories(payload?.categories);
        setCategories(list);
        if (list.length > 0 && !list.some((c) => c.id === valueRef.current)) {
          onChangeRef.current(list[0].id);
        }
      } catch {
        if (!cancelled) toast.error("Could not load categories");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const createCategory = async () => {
    const name = customName.trim();
    if (!name) {
      toast.error("Enter a category name");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug: slugify(name) })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create category");
        return;
      }

      const created = data.category as Category;
      setCategories((prev) =>
        sortBySortOrderThenName(dedupeSelectOptions([...prev, created]))
      );
      onChange(created.id);
      setCustomName("");
      setMode("select");
      toast.success(`Category "${name}" created`);
    } catch {
      toast.error("Failed to create category");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-foreground/60">Loading categories…</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("select")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            mode === "select" ? "bg-primary text-white" : "border text-foreground/70"
          }`}
        >
          Select existing
        </button>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            mode === "custom" ? "bg-primary text-white" : "border text-foreground/70"
          }`}
        >
          Add custom
        </button>
      </div>

      {mode === "select" ? (
        categories.length === 0 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            No categories yet. Switch to &quot;Add custom&quot; to create one.
          </p>
        ) : (
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={categories.some((c) => c.id === value) ? value : categories[0]?.id ?? ""}
            onChange={(e) => onChange(e.target.value)}
            required
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New category name"
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void createCategory();
              }
            }}
          />
          <button
            type="button"
            onClick={() => void createCategory()}
            disabled={creating}
            className="btn-primary inline-flex shrink-0 items-center gap-1 px-4 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {creating ? "Adding…" : "Add"}
          </button>
        </div>
      )}
    </div>
  );
}
