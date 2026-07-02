import { emailAppUrl } from "@/lib/server/notifications/email-app-url";
import { getCategoryUrl } from "@/lib/categories/category-url";

/** Storefront product page URL for emails (never hardcodes domain). */
export function buildProductPageUrl(slug: string | null | undefined): string | undefined {
  const normalized = slug?.trim();
  if (!normalized) return undefined;

  const path = `/product/${encodeURIComponent(normalized)}`;
  const url = emailAppUrl(path);
  if (url === "#") return undefined;
  return url;
}

/** Admin inventory page for staff emails. */
export function buildAdminInventoryUrl(): string {
  const url = emailAppUrl("/admin/inventory");
  return url === "#" ? "/admin/inventory" : url;
}

/** Storefront browse URL for discontinued product alternatives. */
export function buildBrowseProductsUrl(categorySlug?: string | null): string {
  const path = categorySlug?.trim()
    ? getCategoryUrl(categorySlug.trim())
    : "/products";
  const url = emailAppUrl(path);
  return url === "#" ? path : url;
}

/** Admin back-in-stock requests page. */
export function buildAdminBackInStockRequestsUrl(): string {
  const url = emailAppUrl("/admin/products/back-in-stock-requests");
  return url === "#" ? "/admin/products/back-in-stock-requests" : url;
}
