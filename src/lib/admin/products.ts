import type { SupabaseClient } from "@supabase/supabase-js";
import { invalidateAdminDataCaches } from "@/lib/admin/invalidate-admin-caches";
import { processBackInStockNotifications } from "@/lib/stock-notifications/process-restocks";
import {
  normalizeProductColorFields,
  type ProductColorFieldResult
} from "@/lib/products/color-swatches";
import {
  isActiveFromStatus,
  parseProductStatus,
  resolveProductStatus,
  type ProductStatus
} from "@/lib/products/status";
import type { ProductColorSwatch } from "@/types";
import { resolveProductColorSwatches } from "@/lib/products/color-swatches";

export type { ProductColorFieldResult } from "@/lib/products/color-swatches";

export const PRODUCT_HAS_REVIEWS_DELETE_MESSAGE =
  "This product cannot be deleted because it has associated customer reviews. Please remove the reviews first or archive the product.";

export type AdminProductRow = {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  status: ProductStatus;
  is_featured: boolean;
  created_at: string;
  updated_at: string | null;
  category_id: string | null;
  category_name: string | null;
  sub_category_id: string | null;
  sub_category_name: string | null;
  total_stock: number;
};

export type AdminProductStatus = ProductStatus;

export function getProductStatus(product: AdminProductRow): AdminProductStatus {
  return product.status;
}

type DbProduct = {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  images: string[] | null;
  status: string | null;
  is_featured: boolean | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  category_id: string | null;
  categories: { name: string } | { name: string }[] | null;
  sub_category_id: string | null;
  sub_categories: { name: string } | { name: string }[] | null;
  product_variants: { stock_quantity: number | null }[] | null;
};

export async function listAdminProducts(db: SupabaseClient): Promise<AdminProductRow[]> {
  const { data, error } = await db
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      price,
      images,
      status,
      is_featured,
      is_active,
      created_at,
      updated_at,
      category_id,
      sub_category_id,
      categories(name),
      sub_categories(name),
      product_variants(stock_quantity)
    `
    )
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as DbProduct[])
    .map((row) => {
      const category = row.categories;
      const categoryName = Array.isArray(category)
        ? category[0]?.name
        : category?.name ?? null;
      const subCategory = row.sub_categories;
      const subCategoryName = Array.isArray(subCategory)
        ? subCategory[0]?.name
        : subCategory?.name ?? null;

      const totalStock = (row.product_variants ?? []).reduce(
        (sum, v) => sum + Number(v.stock_quantity ?? 0),
        0
      );

      const status = resolveProductStatus({
        status: row.status,
        is_active: row.is_active,
        total_stock: totalStock
      });

      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        price: Number(row.price),
        images: Array.isArray(row.images) ? row.images : [],
        status,
        is_featured: Boolean(row.is_featured),
        created_at: row.created_at,
        updated_at: row.updated_at ?? null,
        category_id: row.category_id,
        category_name: categoryName,
        sub_category_id: row.sub_category_id,
        sub_category_name: subCategoryName,
        total_stock: totalStock
      };
    })
    .filter((row) => row.status !== "archived");
}

export async function countProductReviews(
  db: SupabaseClient,
  productId: string
): Promise<{ count: number; error?: string }> {
  const { count, error } = await db
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  if (error) return { count: 0, error: error.message };
  return { count: count ?? 0 };
}

export function formatProductDeleteError(error: { code?: string; message?: string }): string {
  const message = error.message ?? "";
  const isForeignKey =
    error.code === "23503" ||
    message.toLowerCase().includes("foreign key") ||
    message.toLowerCase().includes("violates");

  if (isForeignKey && message.toLowerCase().includes("review")) {
    return PRODUCT_HAS_REVIEWS_DELETE_MESSAGE;
  }

  if (isForeignKey) {
    return "This product cannot be deleted because it is linked to other records. Archive the product instead.";
  }

  return "Unable to delete this product. Please try again.";
}

export function filterAdminProducts(
  products: AdminProductRow[],
  search: string,
  categoryId: string
): AdminProductRow[] {
  let result = products;

  if (categoryId && categoryId !== "all") {
    result = result.filter((p) => p.category_id === categoryId);
  }

  const q = search.trim().toLowerCase();
  if (q) {
    result = result.filter((p) => p.name.toLowerCase().includes(q));
  }

  return result;
}

export type AdminProductVariant = {
  id: string;
  size: string;
  color: string;
  sku: string | null;
  stock_quantity: number;
  price: number | null;
  compare_price: number | null;
};

export type AdminVariantMatrixRow = {
  id?: string;
  size: string;
  color: string;
  price: number;
  compare_price: number | null;
  stock_quantity: number;
  sku: string;
};

export type AdminProductDetail = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  detailed_description: string | null;
  category_id: string | null;
  sub_category_id: string | null;
  price: number;
  compare_price: number | null;
  fabric: string | null;
  neck_type: string | null;
  sleeve_type: string | null;
  closure_type: string | null;
  occasion: string[];
  colors: string[];
  color_swatches: ProductColorSwatch[];
  sizes: string[];
  images: string[];
  status: ProductStatus;
  is_featured: boolean;
  variants: AdminProductVariant[];
};

export type AdminProductUpdateInput = {
  name: string;
  slug: string;
  short_description: string | null;
  detailed_description: string | null;
  category_id: string;
  sub_category_id: string | null;
  price: number;
  compare_price: number | null;
  fabric: string | null;
  neck_type: string | null;
  sleeve_type: string | null;
  closure_type: string | null;
  occasion: string[];
  colors: string[];
  color_swatches: ProductColorSwatch[];
  sizes: string[];
  images: string[];
  status: ProductStatus;
  is_featured: boolean;
  is_active: boolean;
};

export type AdminVariantUpdateInput = {
  id?: string;
  size: string;
  color: string;
  sku: string | null;
  stock_quantity: number;
  price?: number | null;
  compare_price?: number | null;
};

export function variantMatrixKey(size: string, color: string): string {
  return `${size}::${color}`;
}

export function buildAdminVariantMatrixRows(
  sizes: string[],
  colors: string[],
  existing: AdminProductVariant[],
  defaults: { price: number; compare_price: number | null }
): AdminVariantMatrixRow[] {
  const rows: AdminVariantMatrixRow[] = [];
  for (const size of sizes) {
    for (const color of colors) {
      const found = existing.find((v) => v.size === size && v.color === color);
      rows.push({
        id: found?.id,
        size,
        color,
        price: found?.price ?? defaults.price,
        compare_price: found?.compare_price ?? defaults.compare_price,
        stock_quantity: found?.stock_quantity ?? 0,
        sku: found?.sku ?? ""
      });
    }
  }
  return rows;
}

export function mergeVariantMatrixRows(
  nextRows: AdminVariantMatrixRow[],
  previous: AdminVariantMatrixRow[]
): AdminVariantMatrixRow[] {
  const prevMap = new Map(previous.map((v) => [variantMatrixKey(v.size, v.color), v]));
  return nextRows.map((row) => {
    const existing = prevMap.get(variantMatrixKey(row.size, row.color));
    if (!existing) return row;
    return {
      ...row,
      price: existing.price,
      compare_price: existing.compare_price,
      stock_quantity: existing.stock_quantity,
      sku: existing.sku
    };
  });
}

type DbProductDetail = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  detailed_description: string | null;
  category_id: string | null;
  sub_category_id: string | null;
  price: number | string;
  compare_price: number | string | null;
  fabric: string | null;
  neck_type: string | null;
  sleeve_type: string | null;
  closure_type: string | null;
  occasion: string[] | null;
  colors: string[] | null;
  color_swatches: unknown;
  sizes: string[] | null;
  images: string[] | null;
  status: string | null;
  is_featured: boolean | null;
  is_active: boolean;
  product_variants: Array<{
    id: string;
    size: string;
    color: string;
    sku: string | null;
    stock_quantity: number | null;
    price: number | string | null;
    compare_price: number | string | null;
  }> | null;
};

export async function getAdminProductDetail(
  db: SupabaseClient,
  id: string
): Promise<AdminProductDetail | null> {
  const { data, error } = await db
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      short_description,
      detailed_description,
      category_id,
      sub_category_id,
      price,
      compare_price,
      fabric,
      neck_type,
      sleeve_type,
      closure_type,
      occasion,
      colors,
      color_swatches,
      sizes,
      images,
      status,
      is_featured,
      is_active,
      product_variants(id, size, color, sku, stock_quantity, price, compare_price)
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as DbProductDetail;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    short_description: row.short_description,
    detailed_description: row.detailed_description,
    category_id: row.category_id,
    sub_category_id: row.sub_category_id,
    price: Number(row.price),
    compare_price: row.compare_price != null ? Number(row.compare_price) : null,
    fabric: row.fabric,
    neck_type: row.neck_type,
    sleeve_type: row.sleeve_type,
    closure_type: row.closure_type,
    occasion: Array.isArray(row.occasion) ? row.occasion : [],
    colors: Array.isArray(row.colors) ? row.colors : [],
    color_swatches: resolveProductColorSwatches(row.colors, row.color_swatches),
    sizes: Array.isArray(row.sizes) ? row.sizes : [],
    images: Array.isArray(row.images) ? row.images : [],
    status: resolveProductStatus({
      status: row.status,
      is_active: row.is_active,
      total_stock: (row.product_variants ?? []).reduce(
        (sum, v) => sum + Number(v.stock_quantity ?? 0),
        0
      )
    }),
    is_featured: Boolean(row.is_featured),
    variants: (row.product_variants ?? []).map((v) => ({
      id: v.id,
      size: v.size,
      color: v.color,
      sku: v.sku,
      stock_quantity: Number(v.stock_quantity ?? 0),
      price: v.price != null ? Number(v.price) : null,
      compare_price: v.compare_price != null ? Number(v.compare_price) : null
    }))
  };
}

export function normalizeProductUpdateInput(
  body: Record<string, unknown>
):
  | { product: AdminProductUpdateInput; variants: AdminVariantUpdateInput[] }
  | { error: string }
  | null {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const category_id = typeof body.category_id === "string" ? body.category_id.trim() : "";
  const sub_category_id =
    typeof body.sub_category_id === "string" && body.sub_category_id.trim()
      ? body.sub_category_id.trim()
      : null;
  const price = body.price != null && body.price !== "" ? Number(body.price) : NaN;

  if (!name || !slug || !category_id || Number.isNaN(price)) return null;

  const colorFields = normalizeProductColorFields(body);
  if (!colorFields.ok) return { error: colorFields.error };

  const { colors, color_swatches } = colorFields;

  const compareRaw = body.compare_price;
  const compare_price =
    compareRaw === null || compareRaw === ""
      ? null
      : compareRaw != null
        ? Number(compareRaw)
        : null;

  const sizes = Array.isArray(body.sizes)
    ? body.sizes.filter((s): s is string => typeof s === "string")
    : [];
  const images = Array.isArray(body.images)
    ? body.images.filter((i): i is string => typeof i === "string")
    : [];
  const occasion = Array.isArray(body.occasion)
    ? body.occasion.filter((o): o is string => typeof o === "string")
    : typeof body.occasion === "string"
      ? body.occasion
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean)
      : [];

  const variantsRaw = Array.isArray(body.variants) ? body.variants : [];
  const variants: AdminVariantUpdateInput[] = variantsRaw
    .filter((v): v is Record<string, unknown> => v != null && typeof v === "object")
    .map((v) => {
      const priceRaw = v.price;
      const compareRaw = v.compare_price;
      const parsedPrice =
        priceRaw != null && priceRaw !== "" && !Number.isNaN(Number(priceRaw))
          ? Number(priceRaw)
          : null;
      const parsedCompare =
        compareRaw === null || compareRaw === ""
          ? null
          : compareRaw != null && !Number.isNaN(Number(compareRaw))
            ? Number(compareRaw)
            : null;

      return {
        id: typeof v.id === "string" ? v.id : undefined,
        size: typeof v.size === "string" ? v.size : "",
        color: typeof v.color === "string" ? v.color : "",
        sku: typeof v.sku === "string" ? v.sku.trim() || null : null,
        stock_quantity: Math.max(0, Number(v.stock_quantity ?? 0)),
        price: parsedPrice,
        compare_price: parsedCompare
      };
    })
    .filter((v) => v.size && v.color);

  const status = parseProductStatus(body.status);
  const is_featured = body.is_featured === true || body.featured === true;

  return {
    product: {
      name,
      slug,
      short_description:
        typeof body.short_description === "string" ? body.short_description.trim() || null : null,
      detailed_description:
        typeof body.detailed_description === "string"
          ? body.detailed_description.trim() || null
          : null,
      category_id,
      sub_category_id,
      price,
      compare_price: compare_price != null && !Number.isNaN(compare_price) ? compare_price : null,
      fabric: typeof body.fabric === "string" ? body.fabric.trim() || null : null,
      neck_type: typeof body.neck_type === "string" ? body.neck_type.trim() || null : null,
      sleeve_type: typeof body.sleeve_type === "string" ? body.sleeve_type.trim() || null : null,
      closure_type:
        typeof body.closure_type === "string" ? body.closure_type.trim() || null : null,
      occasion,
      colors,
      color_swatches,
      sizes,
      images,
      status,
      is_featured,
      is_active: isActiveFromStatus(status)
    },
    variants
  };
}

export function normalizeProductCreateFields(
  body: Record<string, unknown>
): Record<string, unknown> | { error: string } {
  const colorFields = normalizeProductColorFields(body);
  if (!colorFields.ok) return { error: colorFields.error };

  const status = parseProductStatus(body.status, {
    is_active: typeof body.is_active === "boolean" ? body.is_active : false
  });
  const is_featured = body.is_featured === true || body.featured === true;

  return {
    ...body,
    colors: colorFields.colors,
    color_swatches: colorFields.color_swatches,
    status,
    is_featured,
    is_active: isActiveFromStatus(status)
  };
}

export function sumVariantStock(variants: { stock_quantity: number }[]): number {
  return variants.reduce((sum, v) => sum + Number(v.stock_quantity ?? 0), 0);
}

export function buildVariantsFromOptions(
  sizes: string[],
  colors: string[],
  defaults: {
    stock_quantity: number;
    price?: number | null;
    compare_price?: number | null;
  }
): AdminVariantUpdateInput[] {
  const rows: AdminVariantUpdateInput[] = [];
  for (const size of sizes) {
    for (const color of colors) {
      rows.push({
        size,
        color,
        sku: null,
        stock_quantity: Math.max(0, defaults.stock_quantity),
        price: defaults.price ?? null,
        compare_price: defaults.compare_price ?? null
      });
    }
  }
  return rows;
}

export async function syncProductStockQuantity(
  db: SupabaseClient,
  productId: string,
  totalStock: number
): Promise<{ error?: string }> {
  const { data: product, error: productError } = await db
    .from("products")
    .select("stock_quantity, name, slug")
    .eq("id", productId)
    .maybeSingle();

  if (productError) return { error: productError.message };

  const previousStock = Number(product?.stock_quantity ?? 0);

  const { error } = await db
    .from("products")
    .update({
      stock_quantity: totalStock,
      updated_at: new Date().toISOString()
    })
    .eq("id", productId);

  if (error) return { error: error.message };

  if (previousStock <= 0 && totalStock > 0) {
    void processBackInStockNotifications(db, productId).catch((err) => {
      console.error("[back-in-stock] notification dispatch failed", {
        productId,
        message: err instanceof Error ? err.message : String(err)
      });
    });
  }

  invalidateAdminDataCaches();
  return {};
}

export async function insertProductVariants(
  db: SupabaseClient,
  productId: string,
  variants: AdminVariantUpdateInput[]
): Promise<{ error?: string }> {
  if (variants.length === 0) return {};

  const { error } = await db.from("product_variants").insert(
    variants.map((variant) => ({
      product_id: productId,
      size: variant.size,
      color: variant.color,
      sku: variant.sku,
      stock_quantity: variant.stock_quantity,
      price: variant.price ?? null,
      compare_price: variant.compare_price ?? null
    }))
  );

  if (error) return { error: error.message };
  return {};
}

export async function updateAdminProductDetail(
  db: SupabaseClient,
  id: string,
  product: AdminProductUpdateInput,
  variants: AdminVariantUpdateInput[]
): Promise<{ error?: string }> {
  const { error: productError } = await db
    .from("products")
    .update({
      name: product.name,
      slug: product.slug,
      short_description: product.short_description,
      detailed_description: product.detailed_description,
      category_id: product.category_id,
      sub_category_id: product.sub_category_id,
      price: product.price,
      compare_price: product.compare_price,
      fabric: product.fabric,
      neck_type: product.neck_type,
      sleeve_type: product.sleeve_type,
      closure_type: product.closure_type,
      occasion: product.occasion,
      colors: product.colors,
      color_swatches: product.color_swatches,
      sizes: product.sizes,
      images: product.images,
      status: product.status,
      is_featured: product.is_featured,
      is_active: product.is_active,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (productError) {
    const message =
      productError.code === "23505"
        ? "A product with this slug or SKU already exists"
        : productError.message;
    return { error: message };
  }

  const { error: deleteVariantsError } = await db
    .from("product_variants")
    .delete()
    .eq("product_id", id);

  if (deleteVariantsError) return { error: deleteVariantsError.message };

  const insertResult = await insertProductVariants(db, id, variants);
  if (insertResult.error) return insertResult;

  const syncResult = await syncProductStockQuantity(db, id, sumVariantStock(variants));
  if (syncResult.error) return syncResult;

  return {};
}
