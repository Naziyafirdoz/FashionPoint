import type { SupabaseClient } from "@supabase/supabase-js";
import { invalidateAdminDataCaches } from "@/lib/admin/invalidate-admin-caches";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import { isAwaitingOrderApproval } from "@/lib/orders/fulfillment-workflow";
import { logWorkflow } from "@/lib/orders/workflow-logger";
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

  logWorkflow("order_approval_start", {
    orderId,
    performedBy: context.performedBy ?? null
  });

  const approvalPayload: Record<string, string | null> = {
    status: "confirmed",
    confirmed_at: now,
    approved_at: now,
    approved_by: context.performedBy ?? null,
    updated_at: now
  };

  const { data: updated, error } = await db
    .from("orders")
    .update(approvalPayload)
    .eq("id", orderId)
    .in("status", ["pending", "processing"])
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.message.includes("approved_at") || error.message.includes("approved_by")) {
      const { data: fallbackUpdated, error: fallbackError } = await db
        .from("orders")
        .update({ status: "confirmed", confirmed_at: now, updated_at: now })
        .eq("id", orderId)
        .in("status", ["pending", "processing"])
        .select("*")
        .maybeSingle();

      if (fallbackError) {
        logWorkflow(
          "order_approval_failed",
          { orderId, error: fallbackError.message },
          "error"
        );
        return { ok: false, status: "error", message: fallbackError.message };
      }

      if (!fallbackUpdated) {
        return handleApprovalConflict(db, orderId, context);
      }

      return completeApproval(db, fallbackUpdated as Order, orderId, context);
    }

    logWorkflow("order_approval_failed", { orderId, error: error.message }, "error");
    return { ok: false, status: "error", message: error.message };
  }

  if (!updated) {
    return handleApprovalConflict(db, orderId, context);
  }

  return completeApproval(db, updated as Order, orderId, context);
}

async function handleApprovalConflict(
  db: SupabaseClient,
  orderId: string,
  context: {
    performedBy?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }
): Promise<ApproveOrderResult> {
  const current = await loadOrder(db, orderId);
  if (!current) {
    logWorkflow("order_approval_failed", { orderId, reason: "not_found" }, "warn");
    return { ok: false, status: "not_found" };
  }

  await markOrderNotificationsHandled(db, orderId);

  const normalized = await normalizeOrderRecord(db, current, { persist: false });
  const status = current.status as string;

  logWorkflow("order_approval_failed", {
    orderId,
    reason: "atomic_update_missed",
    currentStatus: status
  }, "warn");

  if (status === "confirmed") {
    await logAlreadyApprovedAttempt(db, orderId, context);
    return { ok: true, status: "already_approved", order: normalized };
  }

  if (!isAwaitingOrderApproval(status)) {
    return { ok: false, status: "not_awaiting" };
  }

  return { ok: false, status: "conflict" };
}

async function completeApproval(
  db: SupabaseClient,
  updated: Order,
  orderId: string,
  context: {
    performedBy?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }
): Promise<ApproveOrderResult> {
  const now = updated.confirmed_at ?? new Date().toISOString();

  logWorkflow("order_status_transition", {
    orderId,
    orderNumber: updated.order_number,
    toStatus: "confirmed",
    approvedAt: updated.approved_at ?? now,
    approvedBy: updated.approved_by ?? context.performedBy ?? null
  });

  logWorkflow("order_approval_success", {
    orderId,
    orderNumber: updated.order_number,
    confirmedAt: updated.confirmed_at ?? now,
    approvedBy: updated.approved_by ?? context.performedBy ?? null
  });

  invalidateAdminDataCaches();

  await cancelAdminApprovalReminders(db, orderId);

  await markOrderNotificationsHandled(db, orderId);

  if (!(await hasApprovedAuditLog(db, orderId))) {
    await logOrderAction(db, {
      orderId,
      action: "approved",
      performedBy: context.performedBy,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });
  }

  const normalized = await normalizeOrderRecord(db, updated, {
    persist: false
  });

  const customerEmail =
    normalized.shipping_address?.email ?? normalized.guest_email;

  if (customerEmail) {
    try {
      logWorkflow("customer_email_start", {
        orderId,
        orderNumber: normalized.order_number,
        event: "order_confirmed",
        to: customerEmail
      });
      await sendOrderConfirmation({
        to: customerEmail,
        orderNumber: normalized.order_number,
        total: Number(normalized.total),
        order: normalized
      });
      logWorkflow("customer_email_sent", {
        orderId,
        orderNumber: normalized.order_number,
        event: "order_confirmed",
        to: customerEmail
      });
    } catch (err) {
      logWorkflow(
        "customer_email_failed",
        {
          orderId,
          orderNumber: normalized.order_number,
          event: "order_confirmed",
          error: err instanceof Error ? err.message : String(err)
        },
        "error"
      );
    }
  } else {
    logWorkflow("customer_email_skipped", {
      orderId,
      orderNumber: normalized.order_number,
      event: "order_confirmed",
      reason: "no_customer_email"
    });
  }

  return { ok: true, status: "approved", order: normalized };
}
