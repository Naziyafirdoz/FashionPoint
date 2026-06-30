import { colorMatchesFilter } from "@/lib/product-filters";
import { normalizeSizeFilter } from "@/config/size-chart";
import type { Product } from "@/types";

export type FilterOption = {
  value: string;
  label: string;
  count: number;
};

export type ProductFilterOptions = {
  sizes: FilterOption[];
  colors: FilterOption[];
  fabrics: FilterOption[];
  neckTypes: FilterOption[];
  sleeveTypes: FilterOption[];
  priceMin: number | null;
  priceMax: number | null;
};

const EMPTY_OPTIONS: ProductFilterOptions = {
  sizes: [],
  colors: [],
  fabrics: [],
  neckTypes: [],
  sleeveTypes: [],
  priceMin: null,
  priceMax: null
};

function cleanValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

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

function collectStringValues(products: Product[], getter: (product: Product) => string | null): string[] {
  const values: string[] = [];

  for (const product of products) {
    const value = getter(product);
    if (value) values.push(value);
  }

  return sortFilterValues(dedupePreserveOrder(values));
}

function collectSizeValues(products: Product[]): string[] {
  const values: string[] = [];

  for (const product of products) {
    product.sizes?.forEach((size) => {
      const cleaned = cleanValue(size);
      if (cleaned) values.push(cleaned);
    });

    product.variants?.forEach((variant) => {
      const cleaned = cleanValue(variant.size);
      if (cleaned) values.push(cleaned);
    });
  }

  return sortFilterValues(dedupePreserveOrder(values));
}

function collectColorValues(products: Product[]): string[] {
  const values: string[] = [];

  for (const product of products) {
    product.colors?.forEach((color) => {
      const cleaned = cleanValue(color);
      if (cleaned) values.push(cleaned);
    });

    product.variants?.forEach((variant) => {
      const cleaned = cleanValue(variant.color);
      if (cleaned) values.push(cleaned);
    });
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
      const cleaned = cleanValue(value);
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
      const cleaned = cleanValue(value);
      return cleaned ? colorMatchesFilter(cleaned, color) : false;
    });
  }).length;
}

function countProductsMatching(
  products: Product[],
  getter: (product: Product) => string | undefined | null,
  value: string
): number {
  const target = value.toLowerCase();

  return products.filter((product) => {
    const field = cleanValue(getter(product));
    return field?.toLowerCase() === target;
  }).length;
}

function toOptions(
  products: Product[],
  values: string[],
  countFn: (products: Product[], value: string) => number
): FilterOption[] {
  return values.map((value) => ({
    value,
    label: value,
    count: countFn(products, value)
  }));
}

export function extractProductFilterOptions(products: Product[]): ProductFilterOptions {
  if (!products.length) return EMPTY_OPTIONS;

  const sizes = collectSizeValues(products);
  const colors = collectColorValues(products);
  const fabrics = collectStringValues(products, (product) => cleanValue(product.fabric));
  const neckTypes = collectStringValues(products, (product) => cleanValue(product.neck_type));
  const sleeveTypes = collectStringValues(products, (product) => cleanValue(product.sleeve_type));

  const prices = products
    .map((product) => product.price)
    .filter((price) => typeof price === "number" && !Number.isNaN(price));

  const priceMin = prices.length ? Math.min(...prices) : null;
  const priceMax = prices.length ? Math.max(...prices) : null;

  return {
    sizes: toOptions(products, sizes, countProductsWithSize),
    colors: toOptions(products, colors, countProductsWithColor),
    fabrics: toOptions(products, fabrics, (items, value) =>
      countProductsMatching(items, (product) => product.fabric, value)
    ),
    neckTypes: toOptions(products, neckTypes, (items, value) =>
      countProductsMatching(items, (product) => product.neck_type, value)
    ),
    sleeveTypes: toOptions(products, sleeveTypes, (items, value) =>
      countProductsMatching(items, (product) => product.sleeve_type, value)
    ),
    priceMin,
    priceMax
  };
}

export function getActiveFilterLabels(options: ProductFilterOptions): string[] {
  const labels: string[] = [];

  if (options.sizes.length) labels.push("Size");
  if (options.colors.length) labels.push("Color");
  if (options.fabrics.length) labels.push("Fabric");
  if (options.neckTypes.length) labels.push("Neck Type");
  if (options.sleeveTypes.length) labels.push("Sleeve Type");
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
