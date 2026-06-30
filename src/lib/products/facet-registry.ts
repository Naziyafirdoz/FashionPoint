import type { Product } from "@/types";

export type FacetFieldKind = "size" | "color" | "scalar" | "array";

export type FacetFieldDefinition = {
  paramKey: string;
  label: string;
  kind: FacetFieldKind;
  getScalar: (product: Product) => string | null | undefined;
  getArray?: (product: Product) => string[] | null | undefined;
};

function cleanValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function labelFromKey(key: string): string {
  return key
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Server-side registry aligned with filterable product columns.
 * UI components consume discovered facet groups only — not this list.
 */
export const PRODUCT_FACET_FIELDS: FacetFieldDefinition[] = [
  {
    paramKey: "size",
    label: "Size",
    kind: "size",
    getScalar: () => null,
    getArray: (product) => {
      const sizes = new Set<string>();
      product.sizes?.forEach((size) => {
        const cleaned = cleanValue(size);
        if (cleaned) sizes.add(cleaned);
      });
      product.variants?.forEach((variant) => {
        const cleaned = cleanValue(variant.size);
        if (cleaned) sizes.add(cleaned);
      });
      return sizes.size > 0 ? [...sizes] : undefined;
    }
  },
  {
    paramKey: "color",
    label: "Color",
    kind: "color",
    getScalar: () => null,
    getArray: (product) => {
      const colors = new Set<string>();
      product.colors?.forEach((color) => {
        const cleaned = cleanValue(color);
        if (cleaned) colors.add(cleaned);
      });
      product.variants?.forEach((variant) => {
        const cleaned = cleanValue(variant.color);
        if (cleaned) colors.add(cleaned);
      });
      return colors.size > 0 ? [...colors] : undefined;
    }
  },
  {
    paramKey: "fabric",
    label: "Fabric",
    kind: "scalar",
    getScalar: (product) => cleanValue(product.fabric)
  },
  {
    paramKey: "neck",
    label: "Neck Type",
    kind: "scalar",
    getScalar: (product) => cleanValue(product.neck_type)
  },
  {
    paramKey: "sleeve",
    label: "Sleeve Type",
    kind: "scalar",
    getScalar: (product) => cleanValue(product.sleeve_type)
  },
  {
    paramKey: "closure",
    label: "Closure",
    kind: "scalar",
    getScalar: (product) => cleanValue(product.closure_type)
  },
  {
    paramKey: "occasion",
    label: "Occasion",
    kind: "array",
    getScalar: () => null,
    getArray: (product) => {
      const values = (product.occasion ?? [])
        .map((value) => cleanValue(value))
        .filter((value): value is string => Boolean(value));
      return values.length > 0 ? values : undefined;
    }
  },
  {
    paramKey: "tag",
    label: "Tag",
    kind: "array",
    getScalar: () => null,
    getArray: (product) => {
      const values = (product.tags ?? [])
        .map((value) => cleanValue(value))
        .filter((value): value is string => Boolean(value));
      return values.length > 0 ? values : undefined;
    }
  }
];

export function getFacetParamKeys(): string[] {
  return PRODUCT_FACET_FIELDS.map((field) => field.paramKey);
}

export function getFacetDefinitionByParam(paramKey: string): FacetFieldDefinition | undefined {
  return PRODUCT_FACET_FIELDS.find((field) => field.paramKey === paramKey);
}

export function getFacetLabel(paramKey: string): string {
  return getFacetDefinitionByParam(paramKey)?.label ?? labelFromKey(paramKey);
}
