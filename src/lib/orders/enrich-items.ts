import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeOrderItems, type NormalizedOrderItem } from "@/lib/orders/order-items";

type VariantSkuRow = {
  product_id: string;
  size: string;
  color: string;
  sku: string | null;
};

type ProductSkuRow = {
  id: string;
  sku: string | null;
};

function variantKey(productId: string, size: string, color: string) {
  return `${productId}::${size}::${color}`;
}

async function loadSkuMaps(db: SupabaseClient, lines: NormalizedOrderItem[]) {
  const productIds = [...new Set(lines.map((l) => l.productId).filter(Boolean))];
  const variantMap = new Map<string, string>();
  const productMap = new Map<string, string>();

  if (productIds.length === 0) {
    return { variantMap, productMap };
  }

  const { data: variants } = await db
    .from("product_variants")
    .select("product_id, size, color, sku")
    .in("product_id", productIds);

  for (const row of (variants ?? []) as VariantSkuRow[]) {
    if (row.sku?.trim()) {
      variantMap.set(variantKey(row.product_id, row.size, row.color), row.sku.trim());
    }
  }

  const { data: products } = await db
    .from("products")
    .select("id, sku")
    .in("id", productIds);

  for (const row of (products ?? []) as ProductSkuRow[]) {
    if (row.sku?.trim()) {
      productMap.set(row.id, row.sku.trim());
    }
  }

  return { variantMap, productMap };
}

function resolveSku(
  line: NormalizedOrderItem,
  variantMap: Map<string, string>,
  productMap: Map<string, string>
): string | undefined {
  if (line.sku?.trim()) return line.sku.trim();

  const fromVariant = variantMap.get(variantKey(line.productId, line.size, line.color));
  if (fromVariant) return fromVariant;

  const fromProduct = productMap.get(line.productId);
  if (fromProduct) return fromProduct;

  return undefined;
}

export function enrichNormalizedItemsWithSku(
  lines: NormalizedOrderItem[],
  variantMap: Map<string, string>,
  productMap: Map<string, string>
): NormalizedOrderItem[] {
  return lines.map((line) => {
    const sku = resolveSku(line, variantMap, productMap);
    return sku ? { ...line, sku } : line;
  });
}

export async function enrichOrderItemsWithSku(
  db: SupabaseClient,
  items: unknown
): Promise<NormalizedOrderItem[]> {
  const lines = normalizeOrderItems(items);
  if (lines.length === 0) return lines;

  const { variantMap, productMap } = await loadSkuMaps(db, lines);
  return enrichNormalizedItemsWithSku(lines, variantMap, productMap);
}

export function mergeSkuIntoOrderItems(
  items: unknown,
  enriched: NormalizedOrderItem[]
): unknown {
  if (!Array.isArray(items)) return items;

  return items.map((raw, index) => {
    if (raw == null || typeof raw !== "object") return raw;
    const sku = enriched[index]?.sku;
    if (!sku) return raw;
    return { ...(raw as Record<string, unknown>), sku };
  });
}

export async function enrichOrderRecordItems<T extends { items: unknown }>(
  db: SupabaseClient,
  order: T
): Promise<T> {
  const enriched = await enrichOrderItemsWithSku(db, order.items);
  const merged = mergeSkuIntoOrderItems(order.items, enriched);
  return { ...order, items: merged };
}
