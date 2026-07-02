import { getCategoryUrl } from "@/lib/categories/category-url";
import {
  normalizeCategorySlug,
  resolveActiveCategorySlug
} from "@/lib/categories/get-category-by-slug";

/**
 * Static storefront path segments (app routes, not category slugs).
 * Used to detect legacy bare URLs like `/daily-wear` without hardcoding category names.
 */
const RESERVED_STORE_PATH_SEGMENTS = new Set([
  "about",
  "account",
  "admin",
  "ai",
  "ai-features",
  "auth",
  "blog",
  "cart",
  "category",
  "checkout",
  "contact",
  "forgot-password",
  "login",
  "offers",
  "order-success",
  "orders",
  "privacy-policy",
  "product",
  "products",
  "refund-policy",
  "reset-password",
  "return-policy",
  "returns",
  "search",
  "shipping",
  "shipping-policy",
  "signup",
  "size-guide",
  "soon",
  "terms-and-conditions",
  "wishlist"
]);

export function isReservedStorePathSegment(segment: string): boolean {
  return RESERVED_STORE_PATH_SEGMENTS.has(segment.toLowerCase());
}

/** True for single-segment paths that may be legacy category URLs (e.g. `/office-wear`). */
export function mightBeLegacyCategoryPath(pathname: string): boolean {
  if (!pathname.startsWith("/")) return false;

  const path = pathname.slice(1);
  if (!path || path.includes("/")) return false;

  const segment = path.split("?")[0]?.split("#")[0] ?? "";
  if (!normalizeCategorySlug(segment)) return false;

  return !isReservedStorePathSegment(segment);
}

/**
 * Resolve a legacy bare category URL to `/category/{slug}` using the categories table.
 * Returns null when the path is not a legacy category URL or no active category matches.
 */
export async function resolveLegacyCategoryRedirectPath(
  pathname: string
): Promise<string | null> {
  if (!mightBeLegacyCategoryPath(pathname)) return null;

  const segment = pathname.slice(1).split("/")[0]?.split("?")[0]?.split("#")[0] ?? "";
  const resolvedSlug = await resolveActiveCategorySlug(segment);
  if (!resolvedSlug) return null;

  return getCategoryUrl(resolvedSlug);
}
