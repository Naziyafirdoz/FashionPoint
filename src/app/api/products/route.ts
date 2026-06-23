import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import {
  buildVariantsFromOptions,
  insertProductVariants,
  normalizeProductCreateFields,
  sumVariantStock,
  syncProductStockQuantity,
  type AdminVariantUpdateInput
} from "@/lib/admin/products";
import { STOREFRONT_PRODUCT_STATUSES } from "@/lib/products/status";
import { MOCK_PRODUCTS, getProductsByCategory } from "@/lib/mock-data";
import { clearProductColorCountCache, filterProductsByColor } from "@/lib/color-products";
import { filterMockProducts, type ProductFilterParams } from "@/lib/product-filters";
import { normalizeSizeFilter } from "@/config/size-chart";
import { normalizeDbProduct, type DbRow } from "@/lib/products/get-by-slug";
import type { Product } from "@/types";

const PRODUCT_LIST_LIMIT = 20;
const PRODUCT_LIST_SELECT =
  "id,slug,name,description,price,compare_price,status,is_active,images,sizes,colors,fabric,neck_type,category_id,created_at";

let productsApiRequestCount = 0;

function getFilters(url: URL): ProductFilterParams & { category?: string | null } {
  return {
    category: url.searchParams.get("category"),
    size: url.searchParams.get("size"),
    color: url.searchParams.get("color"),
    fabric: url.searchParams.get("fabric"),
    neck: url.searchParams.get("neck"),
    priceMin: url.searchParams.get("priceMin"),
    priceMax: url.searchParams.get("priceMax")
  };
}

export async function GET(req: Request) {
  productsApiRequestCount += 1;
  const start = performance.now();
  console.log("API PRODUCTS CALLED", { count: productsApiRequestCount });
  const url = new URL(req.url);
  const filters = getFilters(url);
  const db = createServiceClient();

  if (db) {
    let query = db
      .from("products")
      .select(PRODUCT_LIST_SELECT)
      .in("status", STOREFRONT_PRODUCT_STATUSES)
      .order("created_at", { ascending: false })
      .limit(PRODUCT_LIST_LIMIT);

    if (filters.category) {
      const { data: cat } = await db
        .from("categories")
        .select("id")
        .eq("slug", filters.category)
        .maybeSingle();
      if (cat) query = query.eq("category_id", cat.id);
    }

    if (filters.size) {
      const normalizedSize = normalizeSizeFilter(filters.size);
      query = query.contains("sizes", [normalizedSize]);
    }
    if (filters.fabric) query = query.ilike("fabric", `%${filters.fabric}%`);
    if (filters.neck) query = query.ilike("neck_type", `%${filters.neck}%`);
    if (filters.priceMin) query = query.gte("price", Number(filters.priceMin));
    if (filters.priceMax) query = query.lte("price", Number(filters.priceMax));

    const { data, error } = await query;
    console.log("[products] elapsed", performance.now() - start, { count: productsApiRequestCount });
    if (!error && data) {
      let products = data.map((row) => normalizeDbProduct(row as DbRow));
      if (filters.color) {
        products = filterProductsByColor(products, filters.color);
      }
      return NextResponse.json({
        products,
        source: "supabase"
      });
    }
  }

  let products: Product[] = filters.category
    ? getProductsByCategory(filters.category)
    : MOCK_PRODUCTS;

  if (!filters.category && products.length === 0) {
    products = MOCK_PRODUCTS;
  }

  products = filterMockProducts(products, filters);

  console.log("[products] elapsed", performance.now() - start, { count: productsApiRequestCount });
  return NextResponse.json({ products, source: "mock" });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

  const { data: adminUser } = await db
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .single();

  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const normalizedBody = normalizeProductCreateFields(body) as Record<string, unknown>;
  const {
    variants: variantsBody,
    initial_stock,
    stock_quantity: _stockQuantity,
    ...productFields
  } = normalizedBody as Record<string, unknown> & {
    variants?: AdminVariantUpdateInput[];
    initial_stock?: number | string;
    sizes?: string[];
    colors?: string[];
  };

  let variants: AdminVariantUpdateInput[] = [];

  if (Array.isArray(variantsBody) && variantsBody.length > 0) {
    variants = variantsBody
      .filter((v) => v && typeof v.size === "string" && typeof v.color === "string")
      .map((v) => {
        const row = v as AdminVariantUpdateInput & Record<string, unknown>;
        const priceRaw = row.price;
        const compareRaw = row.compare_price;
        return {
          size: row.size,
          color: row.color,
          sku: row.sku ?? null,
          stock_quantity: Math.max(0, Number(row.stock_quantity ?? 0)),
          price:
            priceRaw != null && String(priceRaw) !== "" && !Number.isNaN(Number(priceRaw))
              ? Number(priceRaw)
              : null,
          compare_price:
            compareRaw === null || String(compareRaw) === ""
              ? null
              : !Number.isNaN(Number(compareRaw))
                ? Number(compareRaw)
                : null
        };
      });
  } else if (
    Array.isArray(productFields.sizes) &&
    Array.isArray(productFields.colors) &&
    productFields.sizes.length > 0 &&
    productFields.colors.length > 0
  ) {
    const stock = Math.max(0, Number(initial_stock ?? 0) || 0);
    const basePrice = Number(productFields.price);
    const compareRaw = productFields.compare_price;
    const baseCompare =
      compareRaw === null || compareRaw === ""
        ? null
        : compareRaw != null && !Number.isNaN(Number(compareRaw))
          ? Number(compareRaw)
          : null;
    variants = buildVariantsFromOptions(productFields.sizes, productFields.colors, {
      stock_quantity: stock,
      price: Number.isNaN(basePrice) ? null : basePrice,
      compare_price: baseCompare
    });
  }

  const { data, error } = await db.from("products").insert(productFields).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const insertResult = await insertProductVariants(db, data.id, variants);
  if (insertResult.error) {
    await db.from("products").delete().eq("id", data.id);
    return NextResponse.json({ error: insertResult.error }, { status: 400 });
  }

  const syncResult = await syncProductStockQuantity(db, data.id, sumVariantStock(variants));
  if (syncResult.error) {
    return NextResponse.json({ error: syncResult.error }, { status: 400 });
  }

  clearProductColorCountCache();

  const { data: product } = await db
    .from("products")
    .select(
      `
      *,
      categories(*),
      product_variants(id, product_id, size, color, sku, stock_quantity, price, compare_price)
    `
    )
    .eq("id", data.id)
    .single();

  return NextResponse.json({
    product: product ? normalizeDbProduct(product as DbRow) : data
  });
}
