import { cache } from "react";
import { createServiceClient } from "@/lib/supabase";
import type { Category } from "@/types";

const CATEGORY_WEAR_SUFFIX = "-wear";

const CATEGORY_SELECT =
  "id, name, slug, description, image_url, sort_order, is_active, show_in_navbar, navbar_position";

/** Normalize and validate a category slug from a URL segment. */
export function normalizeCategorySlug(slug: string): string | null {
  const normalized = slug.trim().toLowerCase();
  return normalized || null;
}

const listActiveCategorySlugs = cache(async (): Promise<string[]> => {
  const db = createServiceClient();
  if (!db) return [];

  const { data, error } = await db.from("categories").select("slug").eq("is_active", true);
  if (error || !data) return [];

  return data
    .map((row) => String(row.slug).trim().toLowerCase())
    .filter(Boolean);
});

/**
 * Map a requested slug to an active category slug from the database.
 * Supports legacy aliases such as `daily` ↔ `daily-wear` using active slugs only.
 */
export const resolveActiveCategorySlug = cache(
  async (requestedSlug: string): Promise<string | null> => {
    const normalized = normalizeCategorySlug(requestedSlug);
    if (!normalized) return null;

    const slugs = await listActiveCategorySlugs();
    if (slugs.length === 0) return null;

    const slugSet = new Set(slugs);
    if (slugSet.has(normalized)) return normalized;

    const withWearSuffix = `${normalized}${CATEGORY_WEAR_SUFFIX}`;
    if (slugSet.has(withWearSuffix)) return withWearSuffix;

    if (normalized.endsWith(CATEGORY_WEAR_SUFFIX)) {
      const withoutWearSuffix = normalized.slice(0, -CATEGORY_WEAR_SUFFIX.length);
      if (slugSet.has(withoutWearSuffix)) return withoutWearSuffix;
    }

    return null;
  }
);

function mapCategoryRow(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: row.description != null ? String(row.description) : undefined,
    image_url: row.image_url != null ? String(row.image_url) : undefined,
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active),
    show_in_navbar: Boolean(row.show_in_navbar),
    navbar_position: row.navbar_position != null ? Number(row.navbar_position) : null
  };
}

/**
 * Load an active category by slug (with legacy alias resolution).
 * Returns null when the slug is invalid or no matching active category exists.
 */
export const getCategoryBySlug = cache(async (slug: string): Promise<Category | null> => {
  const db = createServiceClient();
  if (!db) return null;

  const resolvedSlug = await resolveActiveCategorySlug(slug);
  if (!resolvedSlug) return null;

  const { data, error } = await db
    .from("categories")
    .select(CATEGORY_SELECT)
    .eq("slug", resolvedSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return mapCategoryRow(data as Record<string, unknown>);
});
