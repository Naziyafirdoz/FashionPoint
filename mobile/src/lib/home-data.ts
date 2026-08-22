import { supabase } from "@/lib/supabase";

export type HomeCategory = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
};

export type HomeProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice: number | null;
  imageUrl: string | null;
  isNew: boolean;
};

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

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function fetchHomeCatalog(): Promise<{
  categories: HomeCategory[];
  products: HomeProduct[];
}> {
  const [categoriesResult, productsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug, image_url, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(12),
    supabase
      .from("products")
      .select(
        "id, name, slug, price, compare_price, images, is_new, is_featured, is_bestseller, created_at"
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  if (productsResult.error) {
    throw new Error("Unable to load products");
  }

  const categories = (categoriesResult.data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    imageUrl: resolveImageUrl(row.image_url),
  }));

  const products = (productsResult.data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    price: toNumber(row.price) ?? 0,
    comparePrice: toNumber(row.compare_price),
    imageUrl: firstImage(row.images),
    isNew: Boolean(row.is_new),
  }));

  return { categories, products };
}
