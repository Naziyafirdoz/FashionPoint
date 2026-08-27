import { apiFetch, resolveMediaUrl } from "@/lib/api";
import { formatInr, getDiscountPercent, type HomeProduct } from "@/lib/home-data";

export { formatInr, getDiscountPercent };

export type CatalogVariant = {
  id: string;
  product_id?: string;
  size: string;
  color: string;
  sku?: string;
  stock_quantity: number;
  price?: number;
  compare_price?: number;
};

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  short_description?: string;
  detailed_description?: string;
  price: number;
  compare_price?: number;
  sku?: string;
  stock_quantity?: number;
  fabric?: string;
  neck_type?: string;
  sleeve_type?: string;
  closure_type?: string;
  occasion?: string[];
  colors?: string[];
  color_swatches?: { name: string; hex?: string | null }[];
  sizes?: string[];
  images?: string[];
  tags?: string[];
  status?: string;
  is_active: boolean;
  is_featured?: boolean;
  is_bestseller?: boolean;
  is_new?: boolean;
  category?: { id?: string; name: string; slug: string };
  variants?: CatalogVariant[];
};

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
};

export type FacetOption = {
  value: string;
  label: string;
  count: number;
};

export type FacetGroup = {
  key: string;
  label: string;
  type: string;
  options: FacetOption[];
};

export type ProductListResult = {
  products: CatalogProduct[];
  total: number;
  page: number;
  pageSize: number;
  facets?: { groups?: FacetGroup[] };
};

export type ProductListQuery = {
  category?: string | null;
  size?: string | null;
  color?: string | null;
  sort?: string | null;
  page?: number;
  limit?: number;
  slugs?: string | null;
};

export const PRODUCT_SORT_OPTIONS = [
  { value: "latest", label: "Latest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "bestselling", label: "Best Selling" },
  { value: "featured", label: "Featured" },
] as const;

export const FALLBACK_SIZES = ["XS(32)", "S(34)", "M(36)", "L(38)", "XL(40)", "XXL(42)"];

function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function variantsOutOfStock(variants: CatalogVariant[] | undefined): boolean {
  if (!variants || variants.length === 0) return false;
  return variants.every((variant) => Number(variant.stock_quantity) === 0);
}

export function isProductOutOfStock(product: Pick<CatalogProduct, "status" | "stock_quantity" | "variants">): boolean {
  if (product.status === "out_of_stock") return true;
  if (variantsOutOfStock(product.variants)) return true;
  if ((!product.variants || product.variants.length === 0) && Number(product.stock_quantity ?? 0) === 0) {
    return true;
  }
  return false;
}

export function firstProductImage(product: CatalogProduct): string | null {
  if (!Array.isArray(product.images)) return null;
  for (const image of product.images) {
    const url = resolveMediaUrl(image);
    if (url) return url;
  }
  return null;
}

export function productToCard(product: CatalogProduct): HomeProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: toNumber(product.price) ?? 0,
    comparePrice: toNumber(product.compare_price),
    imageUrl: firstProductImage(product),
    isNew: Boolean(product.is_new),
    isBestseller: Boolean(product.is_bestseller),
    outOfStock: isProductOutOfStock(product),
  };
}

export function resolveVariant(
  product: CatalogProduct,
  size: string,
  color: string
): { price: number; comparePrice?: number; stock: number; inStock: boolean; sku?: string } {
  const variant = product.variants?.find((item) => item.size === size && item.color === color);
  const price = variant?.price ?? product.price;
  const comparePrice = variant?.compare_price ?? product.compare_price;
  const stock = variant != null ? Number(variant.stock_quantity) : Number(product.stock_quantity ?? 0);
  return {
    price,
    comparePrice,
    stock,
    inStock: stock > 0,
    sku: variant?.sku ?? product.sku,
  };
}

function buildQuery(params: ProductListQuery): string {
  const search = new URLSearchParams();
  if (params.category) search.set("category", params.category);
  if (params.size) search.set("size", params.size);
  if (params.color) search.set("color", params.color);
  if (params.sort) search.set("sort", params.sort);
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.slugs) search.set("slugs", params.slugs);
  const qs = search.toString();
  return qs ? `/api/products?${qs}` : "/api/products";
}

export async function fetchProductList(params: ProductListQuery = {}): Promise<ProductListResult> {
  return apiFetch<ProductListResult>(buildQuery({ limit: 12, page: 1, ...params }), { auth: "none" });
}

export async function fetchProductBySlug(slug: string): Promise<CatalogProduct> {
  const data = await apiFetch<{ product: CatalogProduct }>(
    `/api/products/${encodeURIComponent(slug)}`,
    { auth: "none" }
  );
  return data.product;
}

export async function fetchCategories(): Promise<CatalogCategory[]> {
  const data = await apiFetch<{ categories: CatalogCategory[] }>("/api/categories", { auth: "none" });
  return data.categories ?? [];
}

export async function searchProducts(query: string, page = 1): Promise<ProductListResult> {
  const q = query.trim();
  if (!q) {
    return { products: [], total: 0, page: 1, pageSize: 48 };
  }
  return apiFetch<ProductListResult>(
    `/api/search?q=${encodeURIComponent(q)}&products=1&page=${page}&limit=24`,
    { auth: "none" }
  );
}

export async function searchSuggestions(query: string): Promise<string[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const data = await apiFetch<{ suggestions?: string[] }>(
    `/api/search?q=${encodeURIComponent(q)}&limit=8`,
    { auth: "none" }
  );
  return data.suggestions ?? [];
}
