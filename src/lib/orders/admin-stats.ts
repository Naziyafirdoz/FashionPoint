import type { SupabaseClient } from "@supabase/supabase-js";
import { countPendingCancellationRequests } from "@/lib/orders/cancellation-requests";
import { isCancellationSchemaReady } from "@/lib/orders/cancellation-schema";
import type { AdminOrderStatsV2 } from "@/lib/orders/refund-queue";
import { isRefundOverdue } from "@/lib/orders/refund-queue";

async function countBy(
  db: SupabaseClient,
  filters: { column: string; value: string }[]
): Promise<number> {
  let q = db.from("orders").select("*", { count: "exact", head: true });
  for (const f of filters) {
    q = q.eq(f.column, f.value);
  }
  const { count, error } = await q;
  if (error) return 0;
  return count ?? 0;
}

async function countCancelledAwaitingRefund(db: SupabaseClient): Promise<number> {
  const cancellationReady = await isCancellationSchemaReady(db);
  if (cancellationReady) {
    const { count, error } = await db
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "cancelled")
      .or(
        "refund_status.in.(initiated,pending),and(refund_status.is.null,payment_status.eq.refund_pending)"
      );
    if (!error) return count ?? 0;
  }

  const { count } = await db
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "cancelled")
    .eq("payment_status", "refund_pending");

  return count ?? 0;
}

export async function fetchAdminOrderStats(db: SupabaseClient): Promise<AdminOrderStatsV2> {
  const [
    total,
    pending,
    processing,
    readyToShip,
    shipped,
    outForDelivery,
    delivered,
    cancelled,
    refundPending,
    refunded,
    customerCancellationRefunds
  ] = await Promise.all([
    countBy(db, []),
    countBy(db, [{ column: "status", value: "pending" }]),
    countBy(db, [{ column: "status", value: "processing" }]),
    countBy(db, [{ column: "status", value: "ready_to_ship" }]),
    countBy(db, [{ column: "status", value: "shipped" }]),
    countBy(db, [{ column: "status", value: "out_for_delivery" }]),
    countBy(db, [{ column: "status", value: "delivered" }]),
    countBy(db, [{ column: "status", value: "cancelled" }]),
    countBy(db, [{ column: "payment_status", value: "refund_pending" }]),
    countBy(db, [{ column: "payment_status", value: "refunded" }]),
    countCancelledAwaitingRefund(db)
  ]);

  const { count: returnRequests } = await db
    .from("return_requests")
    .select("*", { count: "exact", head: true });

  const { data: overdueRows } = await db
    .from("orders")
    .select("id, payment_status, payment_method, refund_initiated_at")
    .eq("payment_status", "refund_pending");

  let overdueRefunds = 0;
  for (const row of overdueRows ?? []) {
    if (isRefundOverdue(row as Parameters<typeof isRefundOverdue>[0])) overdueRefunds++;
  }

  const { count: returnsApproved } = await db
    .from("return_requests")
    .select("*", { count: "exact", head: true })
    .in("status", ["return_approved", "pickup_scheduled", "picked_up", "returned"]);

  const { data: cancelledRows } = await db
    .from("orders")
    .select("status, payment_status, payment_method, refund_status")
    .eq("status", "cancelled");

  const pendingCancellations = countPendingCancellationRequests(cancelledRows ?? []);

  return {
    total,
    pending,
    processing,
    readyToShip,
    shipped,
    outForDelivery,
    delivered,
    cancelled,
    pendingCancellations,
    refundPending,
    refunded,
    customerCancellationRefunds,
    returnRequests: returnRequests ?? 0,
    returnsApproved: returnsApproved ?? 0,
    overdueRefunds
  };
}
