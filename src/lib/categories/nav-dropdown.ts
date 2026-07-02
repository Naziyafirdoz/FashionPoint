import { getCategoryUrl } from "@/lib/categories/category-url";
import { createServiceClient } from "@/lib/supabase";
import {
  getActiveSubCategoriesByCategoryIds,
  getSubCategoryHref
} from "@/lib/sub-categories/get-sub-categories";

export type NavDropdownSubCategory = {
  id: string;
  name: string;
  slug: string;
  href: string;
};

export type NavDropdownData = {
  slug: string;
  name: string;
  href: string;
  description: string | null;
  image_url: string | null;
  /** Homepage banner with fallback to category image_url */
  banner_image_url: string | null;
  sub_categories: NavDropdownSubCategory[];
};

export type NavDropdownMap = Record<string, NavDropdownData>;

function resolveBannerImageUrl(
  homepage_banner_image_url: string | null | undefined,
  image_url: string | null | undefined
): string | null {
  const banner = homepage_banner_image_url?.trim();
  if (banner) return banner;
  const image = image_url?.trim();
  return image || null;
}

function buildDropdownData(
  slug: string,
  name: string,
  description: string | null | undefined,
  image_url: string | null | undefined,
  homepage_banner_image_url: string | null | undefined,
  subCategories: NavDropdownSubCategory[]
): NavDropdownData {
  return {
    slug,
    name,
    href: getCategoryUrl(slug),
    description: description?.trim() || null,
    image_url: image_url?.trim() || null,
    banner_image_url: resolveBannerImageUrl(homepage_banner_image_url, image_url),
    sub_categories: subCategories
  };
}

export async function getNavDropdownsBySlugs(slugs: string[]): Promise<NavDropdownMap> {
  const uniqueSlugs = [...new Set(slugs.map((slug) => slug.trim()).filter(Boolean))];
  if (uniqueSlugs.length === 0) return {};

  const db = createServiceClient();
  if (!db) return {};

  const { data: categories, error } = await db
    .from("categories")
    .select("id, name, slug, description, image_url, homepage_banner_image_url")
    .in("slug", uniqueSlugs)
    .eq("is_active", true);

  if (error || !categories?.length) {
    return {};
  }

  const categoryIds = categories.map((category) => String(category.id));
  const subCategoriesByCategoryId = await getActiveSubCategoriesByCategoryIds(categoryIds);

  const dropdowns: NavDropdownMap = {};

  for (const category of categories) {
    const slug = String(category.slug);
    const subs = (subCategoriesByCategoryId.get(String(category.id)) ?? []).map((sub) => ({
      id: sub.id,
      name: sub.name,
      slug: sub.slug,
      href: getSubCategoryHref(slug, sub.slug)
    }));

    dropdowns[slug] = buildDropdownData(
      slug,
      String(category.name),
      category.description != null ? String(category.description) : null,
      category.image_url != null ? String(category.image_url) : null,
      category.homepage_banner_image_url != null
        ? String(category.homepage_banner_image_url)
        : null,
      subs
    );
  }

  return dropdowns;
}
