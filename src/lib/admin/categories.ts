import type { SupabaseClient } from "@supabase/supabase-js";

export const CATEGORY_DESCRIPTION_MAX_LENGTH = 500;

export type AdminCategoryRow = {  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  product_count: number;
};

export type AdminCategoriesSummary = {
  total_categories: number;
  active_categories: number;
  inactive_categories: number;
  total_products: number;
};

type DbCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number | null;
  is_active: boolean;
  created_at: string;
  products: { count: number }[] | { count: number } | null;
};

function parseProductCount(products: DbCategory["products"]): number {
  if (!products) return 0;
  if (Array.isArray(products)) return Number(products[0]?.count ?? 0);
  return Number(products.count ?? 0);
}

export async function listAdminCategories(db: SupabaseClient): Promise<AdminCategoryRow[]> {
  const { data, error } = await db
    .from("categories")
    .select(
      `
      id,
      name,
      slug,
      description,
      image_url,
      sort_order,
      is_active,
      created_at,
      products(count)
    `
    )
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) return [];

  return (data as DbCategory[]).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    image_url: row.image_url,
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    product_count: parseProductCount(row.products)
  }));
}

export async function getAdminCategoriesSummary(
  db: SupabaseClient,
  categories: AdminCategoryRow[]
): Promise<AdminCategoriesSummary> {
  const { count: totalProducts } = await db
    .from("products")
    .select("*", { count: "exact", head: true });

  const active = categories.filter((c) => c.is_active).length;

  return {
    total_categories: categories.length,
    active_categories: active,
    inactive_categories: categories.length - active,
    total_products: totalProducts ?? 0
  };
}

export function filterAdminCategories(
  categories: AdminCategoryRow[],
  search: string,
  status: "all" | "active" | "inactive"
): AdminCategoryRow[] {
  let result = categories;

  if (status === "active") {
    result = result.filter((c) => c.is_active);
  } else if (status === "inactive") {
    result = result.filter((c) => !c.is_active);
  }

  const q = search.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false)
    );
  }

  return result;
}

export function getCategoryDescriptionValidationError(description: unknown): string | null {
  if (description == null || description === "") return null;
  if (typeof description !== "string") return null;

  const trimmed = description.trim();
  if (!trimmed) return null;
  if (trimmed.length > CATEGORY_DESCRIPTION_MAX_LENGTH) {
    return `Description must be ${CATEGORY_DESCRIPTION_MAX_LENGTH} characters or fewer`;
  }

  return null;
}

export function categoryDescriptionPreview(
  description: string | null | undefined,
  maxLength = 120
): { text: string; full: string | null; hasDescription: boolean } {
  const full = description?.trim() || null;

  if (!full) {
    return { text: "No description", full: null, hasDescription: false };
  }

  if (full.length <= maxLength) {
    return { text: full, full, hasDescription: true };
  }

  return {
    text: `${full.slice(0, maxLength).trimEnd()}...`,
    full,
    hasDescription: true
  };
}

export type CategoryUpsertInput = {  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
};

export function normalizeCategoryInput(body: Record<string, unknown>): CategoryUpsertInput | null {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  if (!name || !slug) return null;

  return {
    name,
    slug,
    description:
      typeof body.description === "string"
        ? body.description.trim() || null
        : body.description === null
          ? null
          : undefined,
    image_url:
      typeof body.image_url === "string"
        ? body.image_url.trim() || null
        : body.image_url === null
          ? null
          : undefined,
    sort_order:
      body.sort_order != null && body.sort_order !== ""
        ? Number(body.sort_order)
        : undefined,
    is_active: typeof body.is_active === "boolean" ? body.is_active : undefined
  };
}
