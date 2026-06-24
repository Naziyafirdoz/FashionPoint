import type { SupabaseClient } from "@supabase/supabase-js";
import { invalidateInventoryReportCache } from "@/lib/admin/inventory-report-cache";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import { isAwaitingOrderApproval } from "@/lib/orders/fulfillment-workflow";
import { cancelAdminApprovalReminders } from "@/lib/server/notifications/admin-approval-reminders";
import { sendOrderConfirmation } from "@/lib/server/email";
import {
  hasApprovedAuditLog,
  logAlreadyApprovedAttempt,
  logOrderAction
} from "@/lib/server/order-actions/audit-log";
import type { Order } from "@/types";

export type ApproveOrderResult =
  | { ok: true; status: "approved"; order: Order }
  | { ok: true; status: "already_approved"; order: Order }
  | { ok: false; status: "not_found" | "not_awaiting" | "conflict" | "error"; message?: string };

async function markOrderNotificationsHandled(db: SupabaseClient, orderId: string): Promise<void> {
  await db
    .from("notifications")
    .update({ is_read: true, status: "completed" })
    .eq("order_id", orderId)
    .in("type", ["new_order", "reminder"])
    .eq("status", "active");
}

async function loadOrder(
  db: SupabaseClient,
  orderId: string
): Promise<Order | null> {
  const { data } = await db.from("orders").select("*").eq("id", orderId).maybeSingle();
  return data ? (data as Order) : null;
}

/** Atomically claim approval — only one concurrent request can win. */
export async function executeOrderApproval(
  db: SupabaseClient,
  orderId: string,
  context: {
    performedBy?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }
): Promise<ApproveOrderResult> {
  const now = new Date().toISOString();

  console.info("[approve] updating order to confirmed", { orderId });

  const { data: updated, error } = await db
    .from("orders")
    .update({ status: "confirmed", confirmed_at: now, updated_at: now })
    .eq("id", orderId)
    .in("status", ["pending", "processing"])
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[approve] order update failed", { orderId, message: error.message });
    return { ok: false, status: "error", message: error.message };
  }

  if (!updated) {
    const current = await loadOrder(db, orderId);
    if (!current) {
      console.warn("[approve] order not found", { orderId });
      return { ok: false, status: "not_found" };
    }

    await markOrderNotificationsHandled(db, orderId);

    const normalized = await normalizeOrderRecord(db, current, { persist: false });
    const status = current.status as string;

    console.info("[approve] atomic update matched no row", { orderId, status });

    if (status === "confirmed") {
      await logAlreadyApprovedAttempt(db, orderId, context);
      return { ok: true, status: "already_approved", order: normalized };
    }

    if (!isAwaitingOrderApproval(status)) {
      return { ok: false, status: "not_awaiting" };
    }

    return { ok: false, status: "conflict" };
  }

  console.info("[approve] order confirmed", {
    orderId,
    confirmed_at: updated.confirmed_at ?? now,
    status: updated.status
  });

  invalidateInventoryReportCache();

  await cancelAdminApprovalReminders(db, orderId);
  console.info("[approve] admin approval reminders cancelled", { orderId });

  await markOrderNotificationsHandled(db, orderId);
  console.info("[approve] order notifications marked handled", { orderId });

  if (!(await hasApprovedAuditLog(db, orderId))) {
    await logOrderAction(db, {
      orderId,
      action: "approved",
      performedBy: context.performedBy,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });
  }
  console.info("[approve] audit log recorded", { orderId });

  const normalized = await normalizeOrderRecord(db, updated as Order, {
    persist: false
  });

  const customerEmail =
    normalized.shipping_address?.email ?? normalized.guest_email;

  if (customerEmail) {
    try {
      await sendOrderConfirmation({
        to: customerEmail,
        orderNumber: normalized.order_number,
        total: Number(normalized.total),
        order: normalized
      });
      console.info("[approve] customer confirmation email sent", { orderId });
    } catch (err) {
      console.error("[approve] sendOrderConfirmation failed", { orderId, error: err });
    }
  } else {
    console.info("[approve] no customer email — skipped confirmation", { orderId });
  }

  return { ok: true, status: "approved", order: normalized };
}
