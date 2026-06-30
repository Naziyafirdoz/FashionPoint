export const PRODUCT_SORT_OPTIONS = [
  { value: "latest", label: "Latest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "bestselling", label: "Best Selling" },
  { value: "featured", label: "Featured" }
] as const;

export type ProductSortValue = (typeof PRODUCT_SORT_OPTIONS)[number]["value"];

export function parseProductSort(value: string | null | undefined): ProductSortValue {
  const match = PRODUCT_SORT_OPTIONS.find((option) => option.value === value);
  return match?.value ?? "latest";
}

export function getProductSortLabel(value: ProductSortValue): string {
  return PRODUCT_SORT_OPTIONS.find((option) => option.value === value)?.label ?? "Latest";
}

type SortableQuery = {
  order: (
    column: string,
    options?: { ascending?: boolean; nullsFirst?: boolean }
  ) => SortableQuery;
};

export function applyProductSort<T extends SortableQuery>(query: T, sort: ProductSortValue): T {
  switch (sort) {
    case "price_asc":
      return query.order("price", { ascending: true }) as T;
    case "price_desc":
      return query.order("price", { ascending: false }) as T;
    case "bestselling":
      return query.order("is_bestseller", { ascending: false }).order("created_at", {
        ascending: false
      }) as T;
    case "featured":
      return query.order("is_featured", { ascending: false }).order("created_at", {
        ascending: false
      }) as T;
    case "latest":
    default:
      return query.order("created_at", { ascending: false }) as T;
  }
}
