import type { SupabaseClient } from "@supabase/supabase-js";
import type { CartItem } from "@/types";
import { invalidateAdminDataCaches } from "@/lib/admin/invalidate-admin-caches";
import { processBackInStockNotifications } from "@/lib/stock-notifications/process-restocks";

export type StockValidationError = {
  productId: string;
  name: string;
  size: string;
  color: string;
  requested: number;
  available: number;
  message: string;
};

type OrderLine = Pick<CartItem, "productId" | "name" | "size" | "color" | "quantity">;

export async function syncProductStock(
  db: SupabaseClient,
  productId: string
): Promise<{ error?: string; total?: number }> {
  const { data: product, error: productError } = await db
    .from("products")
    .select("stock_quantity, name, slug")
    .eq("id", productId)
    .maybeSingle();

  if (productError) return { error: productError.message };

  const previousStock = Number(product?.stock_quantity ?? 0);

  const { data: variants, error: fetchError } = await db
    .from("product_variants")
    .select("stock_quantity")
    .eq("product_id", productId);

  if (fetchError) return { error: fetchError.message };

  const total = (variants ?? []).reduce((sum, v) => sum + Number(v.stock_quantity ?? 0), 0);

  const { error: updateError } = await db
    .from("products")
    .update({
      stock_quantity: total,
      updated_at: new Date().toISOString()
    })
    .eq("id", productId);

  if (updateError) return { error: updateError.message };

  if (previousStock <= 0 && total > 0) {
    void processBackInStockNotifications(db, productId).catch((err) => {
      console.error("[back-in-stock] notification dispatch failed", {
        productId,
        message: err instanceof Error ? err.message : String(err)
      });
    });
  }

  invalidateAdminDataCaches();
  return { total };
}

export async function validateOrderStock(
  db: SupabaseClient,
  items: OrderLine[]
): Promise<{ ok: true } | { ok: false; errors: StockValidationError[] }> {
  const errors: StockValidationError[] = [];

  for (const item of items) {
    const { data: variant, error } = await db
      .from("product_variants")
      .select("stock_quantity")
      .eq("product_id", item.productId)
      .eq("size", item.size)
      .eq("color", item.color)
      .maybeSingle();

    if (error) {
      errors.push({
        productId: item.productId,
        name: item.name,
        size: item.size,
        color: item.color,
        requested: item.quantity,
        available: 0,
        message: error.message
      });
      continue;
    }

    const available = Number(variant?.stock_quantity ?? 0);
    if (available < item.quantity) {
      errors.push({
        productId: item.productId,
        name: item.name,
        size: item.size,
        color: item.color,
        requested: item.quantity,
        available,
        message:
          available <= 0
            ? `${item.name} (${item.size}, ${item.color}) is out of stock`
            : `Only ${available} left for ${item.name} (${item.size}, ${item.color})`
      });
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true };
}

export async function deductOrderStock(
  db: SupabaseClient,
  items: OrderLine[]
): Promise<{ error?: string }> {
  /**
   * Stock is reduced only after successful payment finalize.
   * Known limitation: cancelled/refunded orders do not automatically restore
   * variant stock — ops must adjust inventory in admin if needed.
   * TODO: decide and implement cancel/refund restock policy separately.
   */
  const touchedProducts = new Set<string>();

  for (const item of items) {
    const { data: variant, error: fetchError } = await db
      .from("product_variants")
      .select("id, stock_quantity")
      .eq("product_id", item.productId)
      .eq("size", item.size)
      .eq("color", item.color)
      .maybeSingle();

    if (fetchError) return { error: fetchError.message };
    if (!variant) {
      return { error: `Variant not found for ${item.name} (${item.size}, ${item.color})` };
    }

    const current = Number(variant.stock_quantity ?? 0);
    const next = current - item.quantity;
    if (next < 0) {
      return {
        error: `Insufficient stock for ${item.name} (${item.size}, ${item.color})`
      };
    }

    const { error: updateError } = await db
      .from("product_variants")
      .update({ stock_quantity: next })
      .eq("id", variant.id)
      .eq("stock_quantity", current);

    if (updateError) return { error: updateError.message };
    touchedProducts.add(item.productId);
  }

  for (const productId of touchedProducts) {
    const sync = await syncProductStock(db, productId);
    if (sync.error) return sync;
  }

  return {};
}
