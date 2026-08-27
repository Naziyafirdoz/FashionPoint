import { supabase } from "@/lib/supabase";

export type HomeCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  theme: string;
  buttonText: string;
};

export type HomeProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice: number | null;
  imageUrl: string | null;
  isNew: boolean;
  isBestseller: boolean;
  outOfStock: boolean;
};

const FALLBACK_CATEGORY_DESCRIPTION =
  "Explore our curated collection of premium ready-made blouses.";

function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function resolveImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;

  const origin = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");
  if (!origin) return url.startsWith("/") ? url : `/${url}`;
  return `${origin}${url.startsWith("/") ? url : `/${url}`}`;
}

function firstImage(images: unknown): string | null {
  if (!Array.isArray(images)) return null;
  for (const item of images) {
    const url = resolveImageUrl(item);
    if (url) return url;
  }
  return null;
}

function variantsOutOfStock(variants: unknown): boolean {
  if (!Array.isArray(variants) || variants.length === 0) return false;
  return variants.every((variant) => {
    if (!variant || typeof variant !== "object") return true;
    return toNumber((variant as { stock_quantity?: unknown }).stock_quantity) === 0;
  });
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getDiscountPercent(price: number, comparePrice: number | null): number | null {
  if (comparePrice == null || comparePrice <= price) return null;
  return Math.round((1 - price / comparePrice) * 100);
}

function mapCategory(row: Record<string, unknown>): HomeCategory {
  const homepageDescription =
    typeof row.homepage_description === "string" ? row.homepage_description.trim() : "";
  const description = typeof row.description === "string" ? row.description.trim() : "";

  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: homepageDescription || description || FALLBACK_CATEGORY_DESCRIPTION,
    imageUrl: resolveImageUrl(row.image_url),
    bannerUrl: resolveImageUrl(row.homepage_banner_image_url),
    theme: typeof row.homepage_theme === "string" && row.homepage_theme.trim()
      ? row.homepage_theme.trim().toLowerCase()
      : "blush",
    buttonText:
      typeof row.homepage_button_text === "string" && row.homepage_button_text.trim()
        ? row.homepage_button_text.trim()
        : "View Collection",
  };
}

function mapProduct(row: Record<string, unknown>): HomeProduct {
  const status = typeof row.status === "string" ? row.status : "";
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    price: toNumber(row.price) ?? 0,
    comparePrice: toNumber(row.compare_price),
    imageUrl: firstImage(row.images),
    isNew: Boolean(row.is_new),
    isBestseller: Boolean(row.is_bestseller),
    outOfStock: status === "out_of_stock" || variantsOutOfStock(row.product_variants),
  };
}

async function fetchCategories(): Promise<HomeCategory[]> {
  const homepage = await supabase
    .from("categories")
    .select(
      "id, name, slug, description, image_url, homepage_description, homepage_display_order, homepage_theme, homepage_button_text, homepage_banner_image_url"
    )
    .eq("is_active", true)
    .eq("show_on_homepage", true)
    .order("homepage_display_order", { ascending: true });

  if (!homepage.error && homepage.data && homepage.data.length > 0) {
    return homepage.data.map((row) => mapCategory(row as Record<string, unknown>));
  }

  const fallback = await supabase
    .from("categories")
    .select("id, name, slug, description, image_url, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(12);

  return (fallback.data ?? []).map((row) => mapCategory(row as Record<string, unknown>));
}

async function fetchTrendingProducts(): Promise<HomeProduct[]> {
  const withVariants = await supabase
    .from("products")
    .select(
      "id, name, slug, price, compare_price, images, is_new, is_bestseller, status, created_at, product_variants(stock_quantity)"
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(4);

  if (!withVariants.error && withVariants.data) {
    return withVariants.data.map((row) => mapProduct(row as Record<string, unknown>));
  }

  const fallback = await supabase
    .from("products")
    .select(
      "id, name, slug, price, compare_price, images, is_new, is_bestseller, is_featured, created_at"
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(4);

  if (fallback.error) {
    throw new Error("Unable to load products");
  }

  return (fallback.data ?? []).map((row) => mapProduct(row as Record<string, unknown>));
}

export async function fetchHomeCatalog(): Promise<{
  categories: HomeCategory[];
  products: HomeProduct[];
}> {
  const [categories, products] = await Promise.all([
    fetchCategories(),
    fetchTrendingProducts(),
  ]);

  return { categories, products };
}
