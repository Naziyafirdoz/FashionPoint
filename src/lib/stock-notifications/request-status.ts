import type { SupabaseClient } from "@supabase/supabase-js";
import type { StockNotificationStatus } from "./types";

export type CancelStockRequestOptions = {
  reason?: string | null;
  cancelledAt?: string;
};

export async function markStockRequestCancelled(
  db: SupabaseClient,
  requestId: string,
  options: CancelStockRequestOptions = {}
): Promise<boolean> {
  const { data, error } = await db
    .from("out_of_stock_requests")
    .update({
      status: "cancelled" satisfies StockNotificationStatus,
      cancel_reason: options.reason ?? null,
      cancelled_at: options.cancelledAt ?? new Date().toISOString()
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[back-in-stock] failed to cancel request", {
      requestId,
      message: error.message
    });
    return false;
  }

  return Boolean(data);
}

export async function markStockRequestSent(
  db: SupabaseClient,
  requestId: string,
  notifiedAt: string
): Promise<boolean> {
  const { error } = await db
    .from("out_of_stock_requests")
    .update({
      status: "sent" satisfies StockNotificationStatus,
      notified_at: notifiedAt
    })
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) {
    console.error("[back-in-stock] failed to mark request sent", {
      requestId,
      message: error.message
    });
    return false;
  }

  return true;
}
