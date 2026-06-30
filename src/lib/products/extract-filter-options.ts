import { colorMatchesFilter } from "@/lib/product-filters";
import { normalizeSizeFilter } from "@/config/size-chart";
import {
  PRODUCT_FACET_FIELDS,
  type FacetFieldDefinition
} from "@/lib/products/facet-registry";
import type { Product } from "@/types";

export type FilterOption = {
  value: string;
  label: string;
  count: number;
};

export type FacetGroupType = "size" | "color" | "checkbox" | "price";

export type FacetGroup = {
  key: string;
  label: string;
  type: FacetGroupType;
  options: FilterOption[];
};

export type ProductFilterOptions = {
  groups: FacetGroup[];
  priceMin: number | null;
  priceMax: number | null;
};

export const EMPTY_PRODUCT_FILTER_OPTIONS: ProductFilterOptions = {
  groups: [],
  priceMin: null,
  priceMax: null
};

function dedupePreserveOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }

  return result;
}

function extractSortKey(value: string): number | null {
  const parenMatch = value.match(/\((\d+(?:\.\d+)?)\)/);
  if (parenMatch) return Number(parenMatch[1]);

  const leadingNumber = value.match(/^(\d+(?:\.\d+)?)/);
  if (leadingNumber) return Number(leadingNumber[1]);

  return null;
}

function sortFilterValues(values: string[]): string[] {
  return [...values].sort((a, b) => {
    const keyA = extractSortKey(a);
    const keyB = extractSortKey(b);

    if (keyA !== null && keyB !== null && keyA !== keyB) {
      return keyA - keyB;
    }

    return a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });
  });
}

function collectFieldValues(products: Product[], field: FacetFieldDefinition): string[] {
  const values: string[] = [];

  for (const product of products) {
    if (field.kind === "scalar") {
      const scalar = field.getScalar(product);
      if (scalar) values.push(scalar);
      continue;
    }

    const arrayValues = field.getArray?.(product) ?? [];
    arrayValues.forEach((value) => values.push(value));
  }

  return sortFilterValues(dedupePreserveOrder(values));
}

function countProductsWithSize(products: Product[], size: string): number {
  const normalized = normalizeSizeFilter(size).toLowerCase();

  return products.filter((product) => {
    const sizes = [
      ...(product.sizes ?? []),
      ...(product.variants?.map((variant) => variant.size) ?? [])
    ];

    return sizes.some((value) => {
      const cleaned = value?.trim();
      if (!cleaned) return false;
      return (
        cleaned.toLowerCase() === size.toLowerCase() ||
        normalizeSizeFilter(cleaned).toLowerCase() === normalized
      );
    });
  }).length;
}

function countProductsWithColor(products: Product[], color: string): number {
  return products.filter((product) => {
    const colors = [
      ...(product.colors ?? []),
      ...(product.variants?.map((variant) => variant.color) ?? [])
    ];

    return colors.some((value) => {
      const cleaned = value?.trim();
      return cleaned ? colorMatchesFilter(cleaned, color) : false;
    });
  }).length;
}

function countScalarMatches(
  products: Product[],
  field: FacetFieldDefinition,
  value: string
): number {
  const target = value.toLowerCase();

  return products.filter((product) => {
    const scalar = field.getScalar(product)?.trim();
    return scalar?.toLowerCase() === target;
  }).length;
}

function countArrayMatches(
  products: Product[],
  field: FacetFieldDefinition,
  value: string
): number {
  const target = value.toLowerCase();

  return products.filter((product) => {
    const values = field.getArray?.(product) ?? [];
    return values.some((entry) => entry.trim().toLowerCase() === target);
  }).length;
}

function toOptions(
  products: Product[],
  field: FacetFieldDefinition,
  values: string[]
): FilterOption[] {
  return values.map((value) => ({
    value,
    label: value,
    count:
      field.kind === "size"
        ? countProductsWithSize(products, value)
        : field.kind === "color"
          ? countProductsWithColor(products, value)
          : field.kind === "array"
            ? countArrayMatches(products, field, value)
            : countScalarMatches(products, field, value)
  }));
}

function mapFacetType(kind: FacetFieldDefinition["kind"]): FacetGroupType {
  if (kind === "size") return "size";
  if (kind === "color") return "color";
  return "checkbox";
}

export function extractProductFilterOptions(products: Product[]): ProductFilterOptions {
  if (!products.length) return EMPTY_PRODUCT_FILTER_OPTIONS;

  const groups: FacetGroup[] = [];

  for (const field of PRODUCT_FACET_FIELDS) {
    const values = collectFieldValues(products, field);
    if (values.length === 0) continue;

    groups.push({
      key: field.paramKey,
      label: field.label,
      type: mapFacetType(field.kind),
      options: toOptions(products, field, values)
    });
  }

  const prices = products
    .map((product) => product.price)
    .filter((price) => typeof price === "number" && !Number.isNaN(price));

  const priceMin = prices.length ? Math.min(...prices) : null;
  const priceMax = prices.length ? Math.max(...prices) : null;

  return { groups, priceMin, priceMax };
}

export function getActiveFilterLabels(options: ProductFilterOptions): string[] {
  const labels = options.groups.map((group) => group.label);

  if (
    options.priceMin !== null &&
    options.priceMax !== null &&
    options.priceMax > options.priceMin
  ) {
    labels.push("Price");
  }

  return labels;
}

const CSS_COLOR_PATTERN = /^(#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})|rgb\(|rgba\(|hsl\(|hsla\()/i;

export function canRenderColorSwatch(color: string): boolean {
  const trimmed = color.trim();
  if (!trimmed) return false;
  if (CSS_COLOR_PATTERN.test(trimmed)) return true;

  if (typeof document === "undefined") return false;

  const probe = document.createElement("span");
  probe.style.color = "";
  probe.style.color = trimmed.toLowerCase();
  return probe.style.color !== "";
}

/** @deprecated Use groups from ProductFilterOptions instead */
export function getLegacyFacetBuckets(options: ProductFilterOptions) {
  const findGroup = (key: string) => options.groups.find((group) => group.key === key);

  return {
    sizes: findGroup("size")?.options ?? [],
    colors: findGroup("color")?.options ?? [],
    fabrics: findGroup("fabric")?.options ?? [],
    neckTypes: findGroup("neck")?.options ?? [],
    sleeveTypes: findGroup("sleeve")?.options ?? [],
    priceMin: options.priceMin,
    priceMax: options.priceMax
  };
}
