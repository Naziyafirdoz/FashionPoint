import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth/request-user";
import { normalizeDbProduct, type DbRow } from "@/lib/products/get-by-slug";
import { STOREFRONT_PRODUCT_STATUSES } from "@/lib/products/status";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Product } from "@/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PRODUCT_SELECT = `
  *,
  categories(*),
  product_variants(id, product_id, size, color, sku, stock_quantity, price, compare_price)
`;

type WishlistRow = {
  id: string;
  product_id: string;
  created_at: string;
};

type WishlistProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_price: number | null;
  images: string[];
  status: Product["status"];
  is_active: boolean;
  stock_quantity: number | null;
  variants: NonNullable<Product["variants"]>;
};

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function toWishlistProduct(product: Product): WishlistProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    compare_price: product.compare_price ?? null,
    images: product.images ?? [],
    status: product.status,
    is_active: product.is_active,
    stock_quantity: product.stock_quantity ?? null,
    variants: product.variants ?? []
  };
}

function toWishlistItem(row: WishlistRow, product: Product) {
  return {
    id: row.id,
    product_id: row.product_id,
    created_at: row.created_at,
    product: toWishlistProduct(product)
  };
}

async function loadStorefrontProductById(
  db: NonNullable<ReturnType<typeof createAdminClient>>,
  productId: string
): Promise<Product | null> {
  const { data, error } = await db
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", productId)
    .in("status", STOREFRONT_PRODUCT_STATUSES)
    .maybeSingle();

  if (error || !data) return null;
  return normalizeDbProduct(data as DbRow);
}

async function loadStorefrontProductsByIds(
  db: NonNullable<ReturnType<typeof createAdminClient>>,
  productIds: string[]
): Promise<Map<string, Product>> {
  const uniqueIds = [...new Set(productIds)];
  const products = new Map<string, Product>();
  if (uniqueIds.length === 0) return products;

  const { data, error } = await db
    .from("products")
    .select(PRODUCT_SELECT)
    .in("id", uniqueIds)
    .in("status", STOREFRONT_PRODUCT_STATUSES);

  if (error || !data) return products;

  for (const row of data) {
    const product = normalizeDbProduct(row as DbRow);
    products.set(product.id, product);
  }

  return products;
}

export async function GET(req: Request) {
  const auth = await requireRequestUser(req);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const db = createAdminClient();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const { data, error } = await db
    .from("wishlist")
    .select("id, product_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Unable to load wishlist" }, { status: 500 });
  }

  const rows = (data ?? []) as WishlistRow[];
  const products = await loadStorefrontProductsByIds(
    db,
    rows.map((row) => row.product_id)
  );

  const items = rows.flatMap((row) => {
    const product = products.get(row.product_id);
    if (!product) return [];
    return [toWishlistItem(row, product)];
  });

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const auth = await requireRequestUser(req);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const db = createAdminClient();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const productId = (body as Record<string, unknown>).product_id;
  if (typeof productId !== "string" || !productId.trim()) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!isUuid(productId)) {
    return NextResponse.json({ error: "Invalid product_id" }, { status: 400 });
  }

  const product = await loadStorefrontProductById(db, productId);
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const { data, error } = await db
    .from("wishlist")
    .insert({ user_id: user.id, product_id: productId })
    .select("id, product_id, created_at")
    .single();

  let row = (data as WishlistRow | null) ?? null;

  if (error) {
    if (error.code !== "23505") {
      return NextResponse.json({ error: "Unable to update wishlist" }, { status: 500 });
    }

    const existing = await db
      .from("wishlist")
      .select("id, product_id, created_at")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();

    if (existing.error || !existing.data) {
      return NextResponse.json({ error: "Unable to update wishlist" }, { status: 500 });
    }

    row = existing.data as WishlistRow;
  }

  if (!row) {
    return NextResponse.json({ error: "Unable to update wishlist" }, { status: 500 });
  }

  return NextResponse.json({ item: toWishlistItem(row, product) });
}
