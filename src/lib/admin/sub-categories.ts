import type { SupabaseClient } from "@supabase/supabase-js";
import type { SubCategory } from "@/types";
import { dedupeSelectOptions, sortBySortOrderThenName } from "@/lib/admin/select-options";

export const SUB_CATEGORY_DESCRIPTION_MAX_LENGTH = 500;

export type AdminSubCategoryRow = {
  id: string;
  category_id: string;
  category_name: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  product_count: number;
};

type DbSubCategory = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number | null;
  is_active: boolean;
  created_at: string;
  categories: { name: string } | { name: string }[] | null;
  products: { count: number }[] | { count: number } | null;
};

function parseProductCount(products: DbSubCategory["products"]): number {
  if (!products) return 0;
  if (Array.isArray(products)) return Number(products[0]?.count ?? 0);
  return Number(products.count ?? 0);
}

function parseCategoryName(categories: DbSubCategory["categories"]): string {
  if (!categories) return "";
  if (Array.isArray(categories)) return String(categories[0]?.name ?? "");
  return String(categories.name ?? "");
}

export async function listAdminSubCategories(db: SupabaseClient): Promise<AdminSubCategoryRow[]> {
  const { data, error } = await db
    .from("sub_categories")
    .select(
      `
      id,
      category_id,
      name,
      slug,
      description,
      image_url,
      sort_order,
      is_active,
      created_at,
      categories(name),
      products(count)
    `
    )
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) return [];

  return (data as DbSubCategory[]).map((row) => ({
    id: row.id,
    category_id: row.category_id,
    category_name: parseCategoryName(row.categories),
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

export function filterAdminSubCategories(
  rows: AdminSubCategoryRow[],
  search: string,
  categoryId: string,
  status: "all" | "active" | "inactive"
): AdminSubCategoryRow[] {
  let result = rows;

  if (categoryId) {
    result = result.filter((row) => row.category_id === categoryId);
  }

  if (status === "active") {
    result = result.filter((row) => row.is_active);
  } else if (status === "inactive") {
    result = result.filter((row) => !row.is_active);
  }

  const q = search.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.slug.toLowerCase().includes(q) ||
        row.category_name.toLowerCase().includes(q) ||
        (row.description?.toLowerCase().includes(q) ?? false)
    );
  }

  return result;
}

export function getSubCategoryDescriptionValidationError(description: unknown): string | null {
  if (description == null || description === "") return null;
  if (typeof description !== "string") return null;
  const trimmed = description.trim();
  if (!trimmed) return null;
  if (trimmed.length > SUB_CATEGORY_DESCRIPTION_MAX_LENGTH) {
    return `Description must be ${SUB_CATEGORY_DESCRIPTION_MAX_LENGTH} characters or fewer`;
  }
  return null;
}

export type SubCategoryUpsertInput = {
  category_id: string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
};

export function normalizeSubCategoryInput(
  body: Record<string, unknown>
): SubCategoryUpsertInput | null {
  const category_id = typeof body.category_id === "string" ? body.category_id.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  if (!category_id || !name || !slug) return null;

  return {
    category_id,
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
      body.sort_order != null && body.sort_order !== "" ? Number(body.sort_order) : undefined,
    is_active: typeof body.is_active === "boolean" ? body.is_active : undefined
  };
}

export function subCategoryDescriptionPreview(
  description: string | null | undefined,
  maxLength = 120
): { text: string; full: string | null; hasDescription: boolean } {
  const full = description?.trim() || null;
  if (!full) return { text: "No description", full: null, hasDescription: false };
  if (full.length <= maxLength) return { text: full, full, hasDescription: true };
  return {
    text: `${full.slice(0, maxLength).trimEnd()}...`,
    full,
    hasDescription: true
  };
}

export type InlineSubCategoryFormValues = {
  name: string;
  slug: string;
  description: string;
  image_url: string;
};

export const EMPTY_INLINE_SUB_CATEGORY_FORM: InlineSubCategoryFormValues = {
  name: "",
  slug: "",
  description: "",
  image_url: ""
};

export function normalizeClientSubCategories(raw: unknown): SubCategory[] {
  if (!Array.isArray(raw)) return [];

  const filtered = raw
    .filter(
      (item): item is SubCategory =>
        item != null &&
        typeof item === "object" &&
        typeof (item as SubCategory).id === "string" &&
        typeof (item as SubCategory).name === "string"
    )
    .filter((item) => item.is_active !== false);

  return sortBySortOrderThenName(dedupeSelectOptions(filtered));
}

export function getInlineSubCategoryValidationError(
  values: InlineSubCategoryFormValues,
  existing: Pick<SubCategory, "name" | "slug">[]
): string | null {
  const name = values.name.trim();
  const slug = values.slug.trim();
  if (!name) return "Sub category name is required";
  if (!slug) return "Slug is required";

  const descriptionError = getSubCategoryDescriptionValidationError(values.description);
  if (descriptionError) return descriptionError;

  const nameLower = name.toLowerCase();
  const slugLower = slug.toLowerCase();
  if (existing.some((item) => item.name.toLowerCase() === nameLower)) {
    return "A sub category with this name already exists for this category";
  }
  if (existing.some((item) => item.slug.toLowerCase() === slugLower)) {
    return "A sub category with this slug already exists for this category";
  }

  return null;
}

export function buildInlineSubCategoryPayload(
  categoryId: string,
  values: InlineSubCategoryFormValues
): SubCategoryUpsertInput {
  return {
    category_id: categoryId,
    name: values.name.trim(),
    slug: values.slug.trim(),
    description: values.description.trim() || null,
    image_url: values.image_url.trim() || null,
    is_active: true
  };
}
