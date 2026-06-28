import { cache } from "react";
import { createServiceClient } from "@/lib/supabase";
import type { SubCategory } from "@/types";

export async function getActiveSubCategoriesByCategoryId(
  categoryId: string
): Promise<SubCategory[]> {
  const db = createServiceClient();
  if (!db) return [];

  const { data, error } = await db
    .from("sub_categories")
    .select("id, category_id, name, slug, description, image_url, sort_order, is_active")
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) return [];

  return data.map(mapSubCategoryRow);
}

export const getActiveSubCategoriesByCategorySlug = cache(
  async (categorySlug: string): Promise<SubCategory[]> => {
    const db = createServiceClient();
    if (!db) return [];

    const { data: category } = await db
      .from("categories")
      .select("id")
      .eq("slug", categorySlug)
      .eq("is_active", true)
      .maybeSingle();

    if (!category) return [];
    return getActiveSubCategoriesByCategoryId(String(category.id));
  }
);

export async function getActiveSubCategoriesByCategoryIds(
  categoryIds: string[]
): Promise<Map<string, SubCategory[]>> {
  const map = new Map<string, SubCategory[]>();
  if (categoryIds.length === 0) return map;

  const db = createServiceClient();
  if (!db) return map;

  const { data, error } = await db
    .from("sub_categories")
    .select("id, category_id, name, slug, description, image_url, sort_order, is_active")
    .in("category_id", categoryIds)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) return map;

  for (const row of data) {
    const sub = mapSubCategoryRow(row);
    const list = map.get(sub.category_id) ?? [];
    list.push(sub);
    map.set(sub.category_id, list);
  }

  return map;
}

function mapSubCategoryRow(row: Record<string, unknown>): SubCategory {
  return {
    id: String(row.id),
    category_id: String(row.category_id),
    name: String(row.name),
    slug: String(row.slug),
    description: row.description != null ? String(row.description) : null,
    image_url: row.image_url != null ? String(row.image_url) : null,
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active)
  };
}

export function getSubCategoryHref(categorySlug: string, subCategorySlug: string): string {
  return `/category/${categorySlug}?sub_category=${encodeURIComponent(subCategorySlug)}`;
}
