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
import { clearProductColorCountCache } from "@/lib/color-products";
import { parseFilterParams } from "@/lib/product-filters";
import { normalizeDbProduct, type DbRow } from "@/lib/products/get-by-slug";
import { listProductsFromDb } from "@/lib/products/list-products";
import { devLog } from "@/lib/dev-log";

let productsApiRequestCount = 0;

export async function GET(req: Request) {
  productsApiRequestCount += 1;
  const start = performance.now();
  devLog("API PRODUCTS CALLED", { count: productsApiRequestCount });
  const url = new URL(req.url);
  const filters = parseFilterParams(url.searchParams);
  const db = createServiceClient();

  if (!db) {
    return NextResponse.json(
      {
        products: [],
        total: 0,
        page: 1,
        pageSize: 12,
        facets: {
          sizes: [],
          colors: [],
          fabrics: [],
          neckTypes: [],
          sleeveTypes: [],
          priceMin: null,
          priceMax: null
        },
        source: "error",
        error: "Database unavailable"
      },
      { status: 503 }
    );
  }

  const result = await listProductsFromDb(db, filters);
  devLog("[products] elapsed", performance.now() - start, { count: productsApiRequestCount });

  if (!result) {
    return NextResponse.json(
      {
        products: [],
        total: 0,
        page: Number(filters.page) || 1,
        pageSize: Number(filters.limit) || 12,
        facets: {
          sizes: [],
          colors: [],
          fabrics: [],
          neckTypes: [],
          sleeveTypes: [],
          priceMin: null,
          priceMax: null
        },
        source: "error",
        error: "Failed to load products"
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    products: result.products,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    facets: result.facets,
    source: "supabase"
  });
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
