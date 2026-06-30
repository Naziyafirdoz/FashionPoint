import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { filterProductsByColor } from "@/lib/color-products";
import { normalizeSizeFilter } from "@/config/size-chart";
import { extractProductFilterOptions } from "@/lib/products/extract-filter-options";
import { applyProductSort, parseProductSort } from "@/lib/products/catalog-sort";
import { STOREFRONT_PRODUCT_STATUSES } from "@/lib/products/status";
import { normalizeDbProduct, type DbRow } from "@/lib/products/get-by-slug";
import type { Product } from "@/types";
import type { ProductFilterOptions } from "@/lib/products/extract-filter-options";

export const PRODUCT_LIST_PAGE_SIZE = 12;

const PRODUCT_LIST_SELECT = `
  id,
  slug,
  name,
  short_description,
  detailed_description,
  price,
  compare_price,
  status,
  is_active,
  images,
  sizes,
  colors,
  fabric,
  neck_type,
  sleeve_type,
  closure_type,
  occasion,
  tags,
  sku,
  stock_quantity,
  is_new,
  is_bestseller,
  is_featured,
  category_id,
  sub_category_id,
  created_at,
  product_variants(id, product_id, size, color, sku, stock_quantity, price, compare_price)
`;

export type ListProductsParams = {
  category?: string | null;
  sub_category?: string | null;
  size?: string | null;
  color?: string | null;
  fabric?: string | null;
  neck?: string | null;
  sleeve?: string | null;
  closure?: string | null;
  occasion?: string | null;
  tag?: string | null;
  priceMin?: string | null;
  priceMax?: string | null;
  sort?: string | null;
  page?: string | null;
  limit?: string | null;
  includeFacets?: boolean;
  slugs?: string | null;
};

export type ListProductsResult = {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  facets: ProductFilterOptions;
};

async function resolveCategoryId(
  db: SupabaseClient,
  categorySlug: string
): Promise<string | null> {
  const { data } = await db
    .from("categories")
    .select("id")
    .eq("slug", categorySlug)
    .maybeSingle();

  return data?.id ? String(data.id) : null;
}

async function resolveSubCategoryId(
  db: SupabaseClient,
  subCategorySlug: string,
  categoryId: string | null
): Promise<string | null> {
  let query = db
    .from("sub_categories")
    .select("id")
    .eq("slug", subCategorySlug)
    .eq("is_active", true);

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data } = await query.maybeSingle();
  return data?.id ? String(data.id) : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyProductFilters(query: any, params: ListProductsParams, categoryId: string | null) {
  let next = query.in("status", STOREFRONT_PRODUCT_STATUSES);

  if (categoryId) {
    next = next.eq("category_id", categoryId);
  }

  if (params.size) {
    next = next.contains("sizes", [normalizeSizeFilter(params.size)]);
  }
  if (params.fabric) {
    next = next.ilike("fabric", `%${params.fabric}%`);
  }
  if (params.neck) {
    next = next.ilike("neck_type", `%${params.neck}%`);
  }
  if (params.sleeve) {
    next = next.ilike("sleeve_type", `%${params.sleeve}%`);
  }
  if (params.closure) {
    next = next.ilike("closure_type", `%${params.closure}%`);
  }
  if (params.occasion) {
    next = next.contains("occasion", [params.occasion]);
  }
  if (params.tag) {
    next = next.contains("tags", [params.tag]);
  }
  if (params.priceMin) {
    next = next.gte("price", Number(params.priceMin));
  }
  if (params.priceMax) {
    next = next.lte("price", Number(params.priceMax));
  }

  return next;
}

function applyColorFilter(products: Product[], color: string | null | undefined): Product[] {
  if (!color) return products;
  return filterProductsByColor(products, color);
}

function logProductsQueryError(
  error: PostgrestError,
  context: {
    categorySlug?: string | null;
    categoryId: string | null;
    subCategorySlug?: string | null;
    subCategoryId: string | null;
  }
): void {
  console.error("[listProductsFromDb] Supabase query failed", {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
    category_slug: context.categorySlug ?? null,
    category_id: context.categoryId,
    sub_category_slug: context.subCategorySlug ?? null,
    sub_category_id: context.subCategoryId
  });
}

export async function listProductsFromDb(
  db: SupabaseClient,
  params: ListProductsParams
): Promise<ListProductsResult | null> {
  const pageSize = Math.max(1, Math.min(48, Number(params.limit) || PRODUCT_LIST_PAGE_SIZE));
  const page = Math.max(1, Number(params.page) || 1);
  const sort = parseProductSort(params.sort);

  if (params.slugs) {
    const slugList = params.slugs
      .split(",")
      .map((slug) => slug.trim())
      .filter(Boolean)
      .slice(0, 24);

    if (slugList.length === 0) {
      return {
        products: [],
        total: 0,
        page: 1,
        pageSize,
        facets: extractProductFilterOptions([])
      };
    }

    const { data, error } = await db
      .from("products")
      .select(PRODUCT_LIST_SELECT)
      .in("slug", slugList)
      .in("status", STOREFRONT_PRODUCT_STATUSES);

    if (error || !data) return null;

    const bySlug = new Map(
      data.map((row) => [String((row as DbRow).slug), normalizeDbProduct(row as DbRow)])
    );
    const ordered = slugList
      .map((slug) => bySlug.get(slug))
      .filter((product): product is Product => Boolean(product));

    return {
      products: ordered,
      total: ordered.length,
      page: 1,
      pageSize: ordered.length,
      facets: extractProductFilterOptions(ordered)
    };
  }

  const categoryId = params.category ? await resolveCategoryId(db, params.category) : null;

  if (params.category && !categoryId) {
    return {
      products: [],
      total: 0,
      page,
      pageSize,
      facets: extractProductFilterOptions([])
    };
  }

  let subCategoryId: string | null = null;
  if (params.sub_category) {
    subCategoryId = await resolveSubCategoryId(db, params.sub_category, categoryId);
    if (!subCategoryId) {
      return {
        products: [],
        total: 0,
        page,
        pageSize,
        facets: extractProductFilterOptions([])
      };
    }
  }

  const filterParams = { ...params };

  let facetQuery = db.from("products").select(PRODUCT_LIST_SELECT);
  facetQuery = applyProductFilters(facetQuery, filterParams, categoryId);
  if (subCategoryId) {
    facetQuery = facetQuery.eq("sub_category_id", subCategoryId);
  }
  facetQuery = applyProductSort(facetQuery, sort);

  const { data: facetRows, error: facetError } = await facetQuery;

  if (facetError) {
    logProductsQueryError(facetError, {
      categorySlug: params.category,
      categoryId,
      subCategorySlug: params.sub_category,
      subCategoryId: subCategoryId
    });
    return null;
  }

  if (!facetRows) {
    console.error("[listProductsFromDb] Supabase query returned no data", {
      category_slug: params.category ?? null,
      category_id: categoryId,
      sub_category_slug: params.sub_category ?? null,
      sub_category_id: subCategoryId
    });
    return null;
  }

  let facetProducts = facetRows.map((row) => normalizeDbProduct(row as DbRow));
  facetProducts = applyColorFilter(facetProducts, params.color);
  const facets = extractProductFilterOptions(facetProducts);

  const total = facetProducts.length;
  const from = (page - 1) * pageSize;
  const paginatedProducts = facetProducts.slice(from, from + pageSize);

  return {
    products: paginatedProducts,
    total,
    page,
    pageSize,
    facets
  };
}
