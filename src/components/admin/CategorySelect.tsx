"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Category } from "@/types";

type CategorySelectProps = {
  value: string;
  onChange: (categoryId: string) => void;
  /** When true, selects the first category if value is empty after load */
  autoSelectFirst?: boolean;
  className?: string;
};

function normalizeCategories(raw: unknown): Category[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c): c is Category => c != null && typeof c === "object")
    .filter((c) => typeof c.id === "string" && typeof c.name === "string")
    .filter((c) => c.slug !== "soon");
}

export function CategorySelect({
  value,
  onChange,
  autoSelectFirst = false,
  className
}: CategorySelectProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onChangeRef = useRef(onChange);
  const didAutoSelectRef = useRef(false);

  onChangeRef.current = onChange;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/categories");
        if (!res.ok) throw new Error("Failed to load categories");
        const data: unknown = await res.json();
        if (cancelled) return;

        const payload = data as { categories?: unknown } | null;
        const list = normalizeCategories(payload?.categories);

        setCategories(list);

        if (
          autoSelectFirst &&
          list.length > 0 &&
          !didAutoSelectRef.current
        ) {
          didAutoSelectRef.current = true;
          onChangeRef.current(list[0].id);
        }
      } catch {
        if (!cancelled) setError("Could not load categories.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [autoSelectFirst]);

  useEffect(() => {
    if (loading || categories.length === 0 || autoSelectFirst) return;
    if (!value || !categories.some((c) => c.id === value)) {
      onChangeRef.current(categories[0].id);
    }
  }, [loading, categories, value, autoSelectFirst]);

  if (loading) {
    return <p className="text-sm text-foreground/60">Loading categories…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (categories.length === 0) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        No categories found. Add categories first.{" "}
        <Link href="/admin/categories" className="font-semibold text-primary underline">
          Go to Categories
        </Link>
      </p>
    );
  }

  return (
    <select
      className={className ?? "w-full rounded-lg border px-3 py-2"}
      value={categories.some((c) => c.id === value) ? value : categories[0].id}
      onChange={(e) => onChange(e.target.value)}
      required
    >
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
