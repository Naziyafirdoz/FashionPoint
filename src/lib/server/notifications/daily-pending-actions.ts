import type { SupabaseClient } from "@supabase/supabase-js";
import {
  countInventoryStatusRows,
  getInventoryStatus,
  type InventoryRow
} from "@/lib/admin/inventory";
import { isAwaitingOrderApproval } from "@/lib/orders/fulfillment-workflow";
import { isPrepaidPayment } from "@/lib/orders/payment-rules";
import {
  sumPendingActionCounts,
  type DailyPendingActionCounts
} from "@/lib/server/notifications/pending-digest-counts";

export type { DailyPendingActionCounts };

type CountResult = { count: number | null; error: { message: string } | null };

function fail(message: string): never {
  throw new Error(message);
}

async function countOrdersByStatus(
  db: SupabaseClient,
  status: string
): Promise<number> {
  const { count, error }: CountResult = await db
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", status);

  if (error) fail(`Unable to count orders with status ${status}: ${error.message}`);
  return count ?? 0;
}

/**
 * Live pending-action counts for the daily admin digest.
 * Throws if any source query fails so a partial digest is never sent.
 */
export async function getDailyPendingActions(
  db: SupabaseClient
): Promise<DailyPendingActionCounts> {
  const [pending, processing, legacyProcessing, cancellationRequests, refundRows, variantRows] =
    await Promise.all([
      countOrdersByStatus(db, "pending"),
      countOrdersByStatus(db, "processing"),
      countOrdersByStatus(db, "cod_verification"),
      countOrdersByStatus(db, "cancel_requested"),
      db
        .from("orders")
        .select("id, payment_status, payment_method")
        .eq("payment_status", "refund_pending"),
      db.from("product_variants").select("id, stock_quantity")
    ]);

  if (refundRows.error) {
    fail(`Unable to load refund-pending orders: ${refundRows.error.message}`);
  }
  if (variantRows.error) {
    fail(`Unable to load inventory: ${variantRows.error.message}`);
  }

  const newOrders =
    (isAwaitingOrderApproval("pending") ? pending : 0) +
    (isAwaitingOrderApproval("processing") ? processing : 0) +
    (isAwaitingOrderApproval("cod_verification") ? legacyProcessing : 0);

  const refundPending = (refundRows.data ?? []).filter((row) =>
    isPrepaidPayment(row.payment_method as string | undefined)
  ).length;

  const inventory: InventoryRow[] = (variantRows.data ?? []).map((row) => {
    const stock = Number(row.stock_quantity ?? 0);
    return {
      id: String(row.id),
      product_id: "",
      product_name: "",
      size: "",
      color: "",
      sku: null,
      price: null,
      stock_quantity: stock,
      status: getInventoryStatus(stock)
    };
  });

  const stockCounts = countInventoryStatusRows(inventory);

  const counts: DailyPendingActionCounts = {
    newOrders,
    lowStock: stockCounts.lowStock,
    outOfStock: stockCounts.outOfStock,
    cancellationRequests,
    refundPending,
    total: 0
  };

  counts.total = sumPendingActionCounts(counts);

  return counts;
}
