import { fetchProductBySlug, fetchProductList, type CatalogProduct } from "@/lib/catalog";
import { supabase } from "@/lib/supabase";

export type WishlistRow = {
  id: string;
  product_id: string;
  created_at?: string;
};

export type HydratedWishlistItem = WishlistRow & {
  product: CatalogProduct;
};

type WishlistJoinProduct = {
  id?: string;
  name?: string;
  slug?: string;
  price?: number | string;
  images?: string[];
};

type WishlistQueryRow = {
  id: string;
  product_id: string;
  created_at?: string;
  products?: WishlistJoinProduct | WishlistJoinProduct[] | null;
};

async function requireAuthUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Please sign in to continue.");
  }
  return data.user.id;
}

function joinedProduct(raw: WishlistQueryRow["products"]): WishlistJoinProduct | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

function catalogFromJoin(product: WishlistJoinProduct, productId: string): CatalogProduct | null {
  const slug = product.slug?.trim();
  if (!slug) return null;
  return {
    id: product.id?.trim() || productId,
    name: product.name?.trim() || "Product",
    slug,
    price: Number(product.price ?? 0) || 0,
    images: Array.isArray(product.images) ? product.images : [],
    is_active: true,
  };
}

async function resolveWishlistSlugs(rows: WishlistQueryRow[]): Promise<
  Array<WishlistRow & { slug: string; fallback: CatalogProduct | null }>
> {
  const resolved: Array<WishlistRow & { slug: string; fallback: CatalogProduct | null }> = [];

  for (const row of rows) {
    const joined = joinedProduct(row.products);
    let slug = joined?.slug?.trim() ?? "";

    if (!slug && row.product_id) {
      const { data } = await supabase
        .from("products")
        .select("slug")
        .eq("id", row.product_id)
        .maybeSingle();
      slug = typeof data?.slug === "string" ? data.slug : "";
    }

    if (!slug) continue;

    resolved.push({
      id: row.id,
      product_id: row.product_id,
      created_at: row.created_at,
      slug,
      fallback: joined ? catalogFromJoin({ ...joined, slug }, row.product_id) : null,
    });
  }

  return resolved;
}

async function hydrateCatalogProducts(
  entries: Array<WishlistRow & { slug: string; fallback: CatalogProduct | null }>
): Promise<HydratedWishlistItem[]> {
  if (entries.length === 0) return [];

  const slugs = [...new Set(entries.map((entry) => entry.slug))];
  const bySlug = new Map<string, CatalogProduct>();
  const byId = new Map<string, CatalogProduct>();

  try {
    const result = await fetchProductList({ slugs: slugs.join(","), limit: 48 });
    for (const product of result.products) {
      bySlug.set(product.slug, product);
      byId.set(product.id, product);
    }
  } catch {
    // Fall through to per-slug catalog fetch and join fallback.
  }

  const missingSlugs = slugs.filter((slug) => !bySlug.has(slug));
  if (missingSlugs.length > 0) {
    const extras = await Promise.all(
      missingSlugs.map(async (slug) => {
        try {
          return await fetchProductBySlug(slug);
        } catch {
          return null;
        }
      })
    );
    for (const product of extras) {
      if (!product) continue;
      bySlug.set(product.slug, product);
      byId.set(product.id, product);
    }
  }

  const items: HydratedWishlistItem[] = [];
  for (const entry of entries) {
    const product = byId.get(entry.product_id) ?? bySlug.get(entry.slug) ?? entry.fallback;
    if (!product) continue;
    items.push({
      id: entry.id,
      product_id: entry.product_id,
      created_at: entry.created_at,
      product,
    });
  }
  return items;
}

export async function fetchSignedInWishlist(): Promise<HydratedWishlistItem[]> {
  const userId = await requireAuthUserId();
  const { data, error } = await supabase
    .from("wishlist")
    .select("id, product_id, created_at, products(id, name, slug, price, images)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  let rows = (data ?? []) as WishlistQueryRow[];
  if (error) {
    const fallback = await supabase
      .from("wishlist")
      .select("id, product_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (fallback.error) {
      throw new Error(fallback.error.message || "Unable to load wishlist.");
    }
    rows = (fallback.data ?? []) as WishlistQueryRow[];
  }

  const entries = await resolveWishlistSlugs(rows);
  return hydrateCatalogProducts(entries);
}

export async function insertSignedInWishlistItem(productId: string): Promise<WishlistRow> {
  const userId = await requireAuthUserId();
  const { data, error } = await supabase
    .from("wishlist")
    .insert({ user_id: userId, product_id: productId })
    .select("id, product_id, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      const existing = await supabase
        .from("wishlist")
        .select("id, product_id, created_at")
        .eq("user_id", userId)
        .eq("product_id", productId)
        .maybeSingle();
      if (existing.error || !existing.data) {
        throw new Error(existing.error?.message || "Unable to update wishlist.");
      }
      return existing.data as WishlistRow;
    }
    throw new Error(error.message || "Unable to update wishlist.");
  }

  return data as WishlistRow;
}

export async function deleteSignedInWishlistItem(productId: string): Promise<void> {
  const userId = await requireAuthUserId();
  const { error } = await supabase
    .from("wishlist")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", productId);

  if (error) throw new Error(error.message || "Unable to update wishlist.");
}
