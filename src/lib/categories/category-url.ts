const CATEGORY_PATH_PREFIX = "/category/";

type CategorySlugSource = string | { slug: string } | null | undefined;

function resolveCategorySlug(source: CategorySlugSource): string | null {
  if (source == null) return null;

  const slug = typeof source === "string" ? source : source.slug;
  const trimmed = slug?.trim();
  return trimmed ? trimmed : null;
}

/** Canonical storefront category URL: /category/{slug} */
export function getCategoryUrl(source: CategorySlugSource): string {
  const slug = resolveCategorySlug(source);
  if (!slug) return "/products";
  return `${CATEGORY_PATH_PREFIX}${slug}`;
}

/** Like getCategoryUrl but returns null when slug is missing (e.g. disabled card links). */
export function getCategoryUrlOrNull(source: CategorySlugSource): string | null {
  const slug = resolveCategorySlug(source);
  if (!slug) return null;
  return getCategoryUrl(slug);
}

/** Extract category slug from a canonical or legacy bare-slug href. */
export function parseCategorySlugFromHref(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith(CATEGORY_PATH_PREFIX)) {
    const path = trimmed.slice(CATEGORY_PATH_PREFIX.length).split("?")[0]?.split("#")[0] ?? "";
    const slug = path.trim();
    return slug ? decodeURIComponent(slug) : null;
  }

  if (trimmed.startsWith("/") && !trimmed.slice(1).includes("/")) {
    const legacy = trimmed.slice(1).split("?")[0]?.split("#")[0] ?? "";
    return legacy.trim() || null;
  }

  return null;
}
