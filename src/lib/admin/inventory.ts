import type { SupabaseClient } from "@supabase/supabase-js";

export type InventoryStatus = "in_stock" | "low_stock" | "out_of_stock";

export type InventoryRow = {
  id: string;
  product_id: string;
  product_name: string;
  size: string;
  color: string;
  sku: string | null;
  price: number | null;
  stock_quantity: number;
  status: InventoryStatus;
};

/** Matches: SELECT SUM(price * stock_quantity) FROM product_variants */
export function calculateInventoryStockValue(
  rows: Array<{ price: number | null; stock_quantity: number }>
): number {
  let total = 0;

  for (const row of rows) {
    if (row.price == null) continue;
    const price = Number(row.price);
    if (!Number.isFinite(price)) continue;
    total += price * row.stock_quantity;
  }

  return total;
}

export function getInventoryStatus(stock: number): InventoryStatus {
  if (stock <= 0) return "out_of_stock";
  if (stock <= 5) return "low_stock";
  return "in_stock";
}

type DbVariantRow = {
  id: string;
  product_id: string;
  size: string;
  color: string;
  sku: string | null;
  stock_quantity: number | null;
  price: number | null;
  products: { name: string } | { name: string }[] | null;
};

export async function listInventoryVariants(db: SupabaseClient): Promise<InventoryRow[]> {
  const { data, error } = await db
    .from("product_variants")
    .select(
      `
      id,
      product_id,
      size,
      color,
      sku,
      stock_quantity,
      price,
      products(name)
    `
    )
    .order("product_id")
    .order("size")
    .order("color");

  if (error || !data) return [];

  return (data as DbVariantRow[]).map((row) => {
    const product = row.products;
    const productName = Array.isArray(product) ? product[0]?.name : product?.name ?? "—";
    const stock = Number(row.stock_quantity ?? 0);

    return {
      id: row.id,
      product_id: row.product_id,
      product_name: productName,
      size: row.size,
      color: row.color,
      sku: row.sku,
      price: row.price != null ? Number(row.price) : null,
      stock_quantity: stock,
      status: getInventoryStatus(stock)
    };
  });
}
