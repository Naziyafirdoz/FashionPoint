import type { Category } from "@/types";
import type { Product } from "@/types";
import type { CatalogVocabulary } from "@/lib/stylist-assistant/types";

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set([...values].map((value) => value.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
}

export function buildCatalogVocabulary(
  products: Product[],
  categories: Category[]
): CatalogVocabulary {
  const colors = new Set<string>();
  const fabrics = new Set<string>();
  const occasions = new Set<string>();
  const necks = new Set<string>();
  const sleeves = new Set<string>();
  const tags = new Set<string>();
  const sizes = new Set<string>();

  for (const product of products) {
    product.colors?.forEach((color) => colors.add(color));
    product.variants?.forEach((variant) => {
      if (variant.color) colors.add(variant.color);
      if (variant.size) sizes.add(variant.size);
    });
    product.sizes?.forEach((size) => sizes.add(size));
    if (product.fabric) fabrics.add(product.fabric);
    product.occasion?.forEach((occasion) => occasions.add(occasion));
    if (product.neck_type) necks.add(product.neck_type);
    if (product.sleeve_type) sleeves.add(product.sleeve_type);
    product.tags?.forEach((tag) => tags.add(tag));
    if (product.category?.name) {
      // category name collected below
    }
  }

  const categoryNames = categories.map((category) => category.name).filter(Boolean);

  return {
    colors: uniqueSorted(colors),
    fabrics: uniqueSorted(fabrics),
    occasions: uniqueSorted(occasions),
    necks: uniqueSorted(necks),
    sleeves: uniqueSorted(sleeves),
    tags: uniqueSorted(tags),
    categories: uniqueSorted(categoryNames),
    sizes: uniqueSorted(sizes)
  };
}
