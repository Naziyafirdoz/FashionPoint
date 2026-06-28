import type { Category } from "@/types";
import { dedupeSelectOptions, sortBySortOrderThenName } from "@/lib/admin/select-options";

export function normalizeClientCategories(raw: unknown): Category[] {
  if (!Array.isArray(raw)) return [];

  const filtered = raw
    .filter((c): c is Category => c != null && typeof c === "object")
    .filter((c) => typeof c.id === "string" && typeof c.name === "string")
    .filter((c) => c.slug !== "soon")
    .filter((c) => c.is_active !== false);

  return sortBySortOrderThenName(dedupeSelectOptions(filtered));
}
