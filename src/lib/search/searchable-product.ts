import type { Product } from "@/types";
import { normalizeDbProduct, type DbRow } from "@/lib/products/get-by-slug";
import { normalizeSearchText } from "@/lib/search/tokenize-query";

export type SearchableProduct = {
  product: Product;
  subCategoryName: string | null;
  subCategorySlug: string | null;
  nameLower: string;
  categoryNameLower: string;
  subCategoryNameLower: string;
  colorsLower: string[];
  sizes: string[];
  variantSizes: string[];
  variantColors: string[];
  fabricLower: string;
  neckLower: string;
  sleeveLower: string;
  closureLower: string;
  occasionsLower: string[];
  tagsLower: string[];
  skuLower: string;
  descriptionsLower: string;
  seoLower: string;
  attributeBlob: string;
};

function cleanLower(value: unknown): string {
  return typeof value === "string" ? normalizeSearchText(value) : "";
}

function cleanArrayLower(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => normalizeSearchText(value))
    .filter(Boolean);
}

export function mapRowToSearchableProduct(row: DbRow): SearchableProduct {
  const product = normalizeDbProduct(row);
  const subCategoryRow = row.sub_categories as Record<string, unknown> | null | undefined;
  const subCategoryName =
    subCategoryRow && typeof subCategoryRow.name === "string" ? subCategoryRow.name : null;
  const subCategorySlug =
    subCategoryRow && typeof subCategoryRow.slug === "string" ? subCategoryRow.slug : null;

  const variantSizes =
    product.variants?.map((variant) => variant.size).filter(Boolean) ?? [];
  const variantColors =
    product.variants?.map((variant) => variant.color).filter(Boolean) ?? [];

  const colorsLower = (product.colors ?? []).map((color) => normalizeSearchText(color));
  const occasionsLower = cleanArrayLower(product.occasion);
  const tagsLower = cleanArrayLower(product.tags);

  const fabricLower = cleanLower(product.fabric);
  const neckLower = cleanLower(product.neck_type);
  const sleeveLower = cleanLower(product.sleeve_type);
  const closureLower = cleanLower(product.closure_type);
  const categoryNameLower = cleanLower(product.category?.name);
  const subCategoryNameLower = subCategoryName ? normalizeSearchText(subCategoryName) : "";
  const nameLower = normalizeSearchText(product.name);
  const skuLower = cleanLower(product.sku);
  const descriptionsLower = normalizeSearchText(
    [product.short_description, product.detailed_description].filter(Boolean).join(" ")
  );
  const seoLower = normalizeSearchText(
    [product.seo_title, product.seo_description].filter(Boolean).join(" ")
  );

  const attributeBlob = [
    nameLower,
    categoryNameLower,
    subCategoryNameLower,
    ...colorsLower,
    ...variantColors.map((color) => normalizeSearchText(color)),
    fabricLower,
    neckLower,
    sleeveLower,
    closureLower,
    ...occasionsLower,
    ...tagsLower,
    skuLower,
    descriptionsLower,
    seoLower,
    ...(product.sizes ?? []).map((size) => normalizeSearchText(size)),
    ...variantSizes.map((size) => normalizeSearchText(size))
  ]
    .filter(Boolean)
    .join(" ");

  return {
    product,
    subCategoryName,
    subCategorySlug,
    nameLower,
    categoryNameLower,
    subCategoryNameLower,
    colorsLower,
    sizes: product.sizes ?? [],
    variantSizes,
    variantColors,
    fabricLower,
    neckLower,
    sleeveLower,
    closureLower,
    occasionsLower,
    tagsLower,
    skuLower,
    descriptionsLower,
    seoLower,
    attributeBlob
  };
}
