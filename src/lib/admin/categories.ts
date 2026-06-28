import type { SupabaseClient } from "@supabase/supabase-js";

export const CATEGORY_DESCRIPTION_MAX_LENGTH = 500;
export const HOMEPAGE_DESCRIPTION_MAX_LENGTH = 120;

export type AdminCategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  show_in_navbar: boolean;
  navbar_position: number | null;
  show_on_homepage: boolean;
  homepage_description: string | null;
  homepage_display_order: number;
  homepage_theme: string | null;
  homepage_button_text: string | null;
  homepage_banner_image_url: string | null;
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
  show_in_navbar: boolean;
  navbar_position: number | null;
  show_on_homepage?: boolean | null;
  homepage_description?: string | null;
  homepage_display_order?: number | null;
  homepage_theme?: string | null;
  homepage_button_text?: string | null;
  homepage_banner_image_url?: string | null;
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
      show_in_navbar,
      navbar_position,
      show_on_homepage,
      homepage_description,
      homepage_display_order,
      homepage_theme,
      homepage_button_text,
      homepage_banner_image_url,
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
    show_in_navbar: Boolean(row.show_in_navbar),
    navbar_position: row.navbar_position != null ? Number(row.navbar_position) : null,
    show_on_homepage: Boolean(row.show_on_homepage ?? false),
    homepage_description: row.homepage_description ?? null,
    homepage_display_order: Number(row.homepage_display_order ?? 0),
    homepage_theme: row.homepage_theme != null ? String(row.homepage_theme) : null,
    homepage_button_text: row.homepage_button_text ?? null,
    homepage_banner_image_url: row.homepage_banner_image_url ?? null,
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

export type CategoryUpsertInput = {
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
  show_in_navbar?: boolean;
  navbar_position?: number | null;
  show_on_homepage?: boolean;
  homepage_description?: string | null;
  homepage_display_order?: number;
  homepage_theme?: string | null;
  homepage_button_text?: string | null;
  homepage_banner_image_url?: string | null;
};

export function getHomepageDescriptionValidationError(description: unknown): string | null {
  if (description == null || description === "") return null;
  if (typeof description !== "string") return "Homepage description must be a string";

  const trimmed = description.trim();
  if (!trimmed) return null;
  if (trimmed.length > HOMEPAGE_DESCRIPTION_MAX_LENGTH) {
    return `Homepage description must be ${HOMEPAGE_DESCRIPTION_MAX_LENGTH} characters or fewer`;
  }

  return null;
}

export function getHomepageDisplayOrderValidationError(value: unknown): string | null {
  if (value == null || value === "") return null;
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    return "Homepage display order must be an integer greater than or equal to 0";
  }
  return null;
}

export function getHomepageThemeValidationError(theme: unknown): string | null {
  if (theme == null || theme === "") return null;
  if (typeof theme !== "string" || !theme.trim()) {
    return "Homepage theme must be a string";
  }
  return null;
}

export function getHomepageButtonTextValidationError(text: unknown): string | null {
  if (text == null || text === "") return null;
  if (typeof text !== "string") {
    return "Homepage button text must be a string";
  }
  return null;
}

export function getHomepageFieldsValidationError(body: Record<string, unknown>): string | null {
  if (body.show_on_homepage !== undefined && typeof body.show_on_homepage !== "boolean") {
    return "show_on_homepage must be a boolean";
  }

  return (
    getHomepageDescriptionValidationError(body.homepage_description) ??
    getHomepageDisplayOrderValidationError(body.homepage_display_order) ??
    getHomepageThemeValidationError(body.homepage_theme) ??
    getHomepageButtonTextValidationError(body.homepage_button_text)
  );
}

export function getNavbarPositionValidationError(value: unknown): string | null {
  if (value == null || value === "") return null;
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) {
    return "Navbar position must be a positive integer";
  }
  return null;
}

export async function getNextNavbarPosition(db: SupabaseClient): Promise<number> {
  const { data } = await db
    .from("categories")
    .select("navbar_position")
    .eq("show_in_navbar", true);

  const max = (data ?? []).reduce(
    (highest, row) => Math.max(highest, Number(row.navbar_position ?? 0)),
    0
  );
  return max + 1;
}

export async function syncNavbarPositions(db: SupabaseClient): Promise<void> {
  await db.from("categories").update({ navbar_position: null }).eq("show_in_navbar", false);

  const { data } = await db
    .from("categories")
    .select("id, sort_order, navbar_position")
    .eq("show_in_navbar", true);

  if (!data?.length) return;

  const sorted = [...data].sort((a, b) => {
    const posA = a.navbar_position ?? Number.MAX_SAFE_INTEGER;
    const posB = b.navbar_position ?? Number.MAX_SAFE_INTEGER;
    if (posA !== posB) return posA - posB;
    return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
  });

  await Promise.all(
    sorted.map((row, index) =>
      db.from("categories").update({ navbar_position: index + 1 }).eq("id", row.id)
    )
  );
}

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
    is_active: typeof body.is_active === "boolean" ? body.is_active : undefined,
    show_in_navbar: typeof body.show_in_navbar === "boolean" ? body.show_in_navbar : undefined,
    navbar_position:
      body.navbar_position === null
        ? null
        : body.navbar_position !== undefined && body.navbar_position !== ""
          ? Number(body.navbar_position)
          : undefined,
    show_on_homepage:
      typeof body.show_on_homepage === "boolean" ? body.show_on_homepage : undefined,
    homepage_description:
      typeof body.homepage_description === "string"
        ? body.homepage_description.trim() || null
        : body.homepage_description === null
          ? null
          : undefined,
    homepage_display_order:
      body.homepage_display_order != null && body.homepage_display_order !== ""
        ? Number(body.homepage_display_order)
        : undefined,
    homepage_theme:
      typeof body.homepage_theme === "string"
        ? body.homepage_theme.trim() || null
        : body.homepage_theme === null
          ? null
          : undefined,
    homepage_button_text:
      typeof body.homepage_button_text === "string"
        ? body.homepage_button_text.trim() || null
        : body.homepage_button_text === null
          ? null
          : undefined,
    homepage_banner_image_url:
      typeof body.homepage_banner_image_url === "string"
        ? body.homepage_banner_image_url.trim() || null
        : body.homepage_banner_image_url === null
          ? null
          : undefined
  };
}
