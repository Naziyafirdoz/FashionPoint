import { cache } from "react";
import { createServiceClient } from "@/lib/supabase";
import type { CategoryPageData, RelatedCategory, SubCategory } from "@/types";
import { getCategoryBySlug } from "@/lib/categories/get-category-by-slug";
import { getActiveSubCategoriesByCategoryId } from "@/lib/sub-categories/get-sub-categories";

const CATEGORY_PAGE_SELECT = `
  id,
  name,
  slug,
  description,
  image_url,
  sort_order,
  is_active,
  show_in_navbar,
  navbar_position,
  homepage_description,
  homepage_theme,
  homepage_button_text,
  homepage_banner_image_url,
  products(count)
`;

type DbCategoryPageRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number | null;
  is_active: boolean;
  show_in_navbar: boolean;
  navbar_position: number | null;
  homepage_description: string | null;
  homepage_theme: string | null;
  homepage_button_text: string | null;
  homepage_banner_image_url: string | null;
  products: { count: number }[] | { count: number } | null;
};

function parseProductCount(products: DbCategoryPageRow["products"]): number {
  if (!products) return 0;
  if (Array.isArray(products)) return Number(products[0]?.count ?? 0);
  return Number(products.count ?? 0);
}

function formatRelatedCategoryProductCount(count: number): string | undefined {
  if (!Number.isFinite(count) || count <= 0) return undefined;
  const formatted = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(count);
  return `${formatted} product${count === 1 ? "" : "s"}`;
}

function normalizeCategoryBannerUrl(
  homepageBanner: string | null | undefined,
  imageUrl: string | null | undefined
): string | undefined {
  const banner = homepageBanner?.trim() || imageUrl?.trim();
  return banner || undefined;
}

function mapCategoryPageRow(row: DbCategoryPageRow): CategoryPageData {
  const description = row.description?.trim() || undefined;
  const homepageDescription = row.homepage_description?.trim() || undefined;
  const bannerUrl = row.homepage_banner_image_url?.trim() || row.image_url?.trim() || undefined;
  const ctaLabel = row.homepage_button_text?.trim() || undefined;

  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description,
    image_url: row.image_url?.trim() || undefined,
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active),
    show_in_navbar: Boolean(row.show_in_navbar),
    navbar_position: row.navbar_position != null ? Number(row.navbar_position) : null,
    hero_subtitle: homepageDescription,
    banner_image_url: bannerUrl,
    cta_label: ctaLabel,
    theme: row.homepage_theme?.trim() || undefined,
    product_count: parseProductCount(row.products)
  };
}

export const getCategoryPageData = cache(async (slug: string): Promise<CategoryPageData | null> => {
  const category = await getCategoryBySlug(slug);
  if (!category) return null;

  const db = createServiceClient();
  if (!db) return null;

  const { data, error } = await db
    .from("categories")
    .select(CATEGORY_PAGE_SELECT)
    .eq("slug", category.slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return mapCategoryPageRow(data as DbCategoryPageRow);
});

export const getRelatedCategories = cache(
  async (currentCategoryId: string, limit = 8): Promise<RelatedCategory[]> => {
    const db = createServiceClient();
    if (!db) return [];

    const { data, error } = await db
      .from("categories")
      .select(
        `
        id,
        name,
        slug,
        image_url,
        homepage_banner_image_url,
        products(count)
      `
      )
      .eq("is_active", true)
      .neq("id", currentCategoryId)
      .order("sort_order", { ascending: true })
      .limit(limit);

    if (error || !data) return [];

    const related: RelatedCategory[] = [];

    for (const row of data) {
      const banner = normalizeCategoryBannerUrl(
        (row as DbCategoryPageRow).homepage_banner_image_url,
        (row as DbCategoryPageRow).image_url
      );
      if (!banner) continue;

      const productCount = parseProductCount((row as DbCategoryPageRow).products);

      related.push({
        id: String(row.id),
        name: String(row.name),
        slug: String(row.slug),
        banner_image_url: banner,
        product_count: productCount,
        product_count_label: formatRelatedCategoryProductCount(productCount)
      });
    }

    return related;
  }
);

export async function getCategoryPageBundle(slug: string): Promise<{
  category: CategoryPageData;
  subCategories: SubCategory[];
  relatedCategories: RelatedCategory[];
} | null> {
  const category = await getCategoryPageData(slug);
  if (!category) return null;

  const [subCategories, relatedCategories] = await Promise.all([
    getActiveSubCategoriesByCategoryId(category.id),
    getRelatedCategories(category.id)
  ]);

  return { category, subCategories, relatedCategories };
}

export function buildCategoryMetadata(category: CategoryPageData) {
  const title = `${category.name}`;
  const description =
    category.hero_subtitle?.trim() ||
    category.description?.trim() ||
    undefined;

  return {
    title,
    description,
    openGraph: description
      ? {
          title,
          description,
          ...(category.banner_image_url ? { images: [{ url: category.banner_image_url }] } : {})
        }
      : { title }
  };
}
