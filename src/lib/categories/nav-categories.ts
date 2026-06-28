import type { Category } from "@/types";

export const FEATURED_CATEGORY_COUNT = 3;

export type NavCategoryLink = {
  label: string;
  href: string;
};

export function getCategoryHref(slug: string): string {
  return `/${slug}`;
}

export function toNavCategoryLink(category: Category): NavCategoryLink {
  return {
    label: category.name.toUpperCase(),
    href: getCategoryHref(category.slug)
  };
}

function sortBySortOrder(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => a.sort_order - b.sort_order);
}

function sortFeaturedCategories(featured: Category[]): Category[] {
  const allPositionsNull = featured.every((category) => category.navbar_position == null);

  return [...featured].sort((a, b) => {
    if (allPositionsNull) {
      return a.sort_order - b.sort_order;
    }

    const posA = a.navbar_position ?? Number.MAX_SAFE_INTEGER;
    const posB = b.navbar_position ?? Number.MAX_SAFE_INTEGER;
    if (posA !== posB) return posA - posB;
    return a.sort_order - b.sort_order;
  });
}

export function splitCategoriesForNav(categories: Category[]): {
  featured: NavCategoryLink[];
  more: NavCategoryLink[];
} {
  const sorted = sortBySortOrder(categories);

  if (sorted.length <= FEATURED_CATEGORY_COUNT) {
    return {
      featured: sorted.map(toNavCategoryLink),
      more: []
    };
  }

  const featuredCandidates = sorted.filter((category) => category.show_in_navbar);
  const orderedFeatured = sortFeaturedCategories(featuredCandidates);

  const direct: Category[] = [];
  const directIds = new Set<string>();

  for (const category of orderedFeatured) {
    if (direct.length >= FEATURED_CATEGORY_COUNT) break;
    direct.push(category);
    directIds.add(category.id);
  }

  if (direct.length < FEATURED_CATEGORY_COUNT) {
    for (const category of sorted) {
      if (directIds.has(category.id)) continue;
      direct.push(category);
      directIds.add(category.id);
      if (direct.length >= FEATURED_CATEGORY_COUNT) break;
    }
  }

  const remainingFeatured = orderedFeatured.filter((category) => !directIds.has(category.id));
  const remainingNormal = sorted.filter(
    (category) => !category.show_in_navbar && !directIds.has(category.id)
  );

  return {
    featured: direct.map(toNavCategoryLink),
    more: [...remainingFeatured, ...remainingNormal].map(toNavCategoryLink)
  };
}
