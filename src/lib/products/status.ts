export type ProductStatus = "draft" | "active" | "out_of_stock" | "archived";

export const PRODUCT_STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "out_of_stock", label: "Out of Stock" },
  { value: "archived", label: "Archived" }
];

export const STOREFRONT_PRODUCT_STATUSES: ProductStatus[] = ["active", "out_of_stock"];

const VALID_STATUSES = new Set<ProductStatus>([
  "draft",
  "active",
  "out_of_stock",
  "archived"
]);

export function isProductStatus(value: string): value is ProductStatus {
  return VALID_STATUSES.has(value as ProductStatus);
}

export function isActiveFromStatus(status: ProductStatus): boolean {
  return status === "active" || status === "out_of_stock";
}

export function resolveProductStatus(input: {
  status?: string | null;
  is_active?: boolean | null;
  total_stock?: number | null;
}): ProductStatus {
  if (input.status && isProductStatus(input.status)) {
    return input.status;
  }
  if (input.is_active === false) return "draft";
  if ((input.total_stock ?? 0) <= 0) return "out_of_stock";
  return "active";
}

export function parseProductStatus(
  raw: unknown,
  fallback?: { is_active?: boolean | null; total_stock?: number | null }
): ProductStatus {
  if (typeof raw === "string" && isProductStatus(raw)) return raw;
  if (fallback) return resolveProductStatus(fallback);
  return "draft";
}
