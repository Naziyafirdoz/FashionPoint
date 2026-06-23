import type { SupabaseClient } from "@supabase/supabase-js";
import { isAwaitingOrderApproval } from "@/lib/orders/fulfillment-workflow";
import {
  cancelAdminApprovalReminders,
  scheduleAdminApprovalReminder
} from "@/lib/server/notifications/admin-approval-reminders";
import {
  logAlreadyApprovedAttempt,
  logOrderAction
} from "@/lib/server/order-actions/audit-log";
import type { Order } from "@/types";

export type RemindOrderResult =
  | { ok: true; status: "scheduled"; order: Order; remindAt: string }
  | { ok: true; status: "already_approved"; order: Order }
  | { ok: false; status: "not_found" | "not_awaiting" | "error"; message?: string };

async function loadOrderStatus(
  db: SupabaseClient,
  orderId: string
): Promise<{ order: Order | null; status: string | null }> {
  const { data, error } = await db.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (error || !data) return { order: null, status: null };
  return { order: data as Order, status: data.status as string };
}

export async function executeOrderRemindLater(
  db: SupabaseClient,
  orderId: string,
  context: {
    performedBy?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }
): Promise<RemindOrderResult> {
  console.info("[remind] starting", { orderId });

  const initial = await loadOrderStatus(db, orderId);
  if (!initial.order) {
    console.warn("[remind] order not found", { orderId });
    return { ok: false, status: "not_found" };
  }

  console.info("[remind] initial order status", { orderId, status: initial.status });

  if (initial.status === "confirmed") {
    await logAlreadyApprovedAttempt(db, orderId, context);
    console.info("[remind] order already confirmed — skipping schedule", { orderId });
    return { ok: true, status: "already_approved", order: initial.order };
  }

  if (!initial.status || !isAwaitingOrderApproval(initial.status)) {
    console.warn("[remind] order not awaiting approval", { orderId, status: initial.status });
    return { ok: false, status: "not_awaiting" };
  }

  const scheduled = await scheduleAdminApprovalReminder(db, initial.order);
  if (!scheduled.ok) {
    console.error("[remind] scheduleAdminApprovalReminder failed", {
      orderId,
      error: scheduled.error
    });
    return { ok: false, status: "error", message: scheduled.error };
  }

  console.info("[remind] reminder scheduled", {
    orderId,
    remindAt: scheduled.remindAt
  });

  const after = await loadOrderStatus(db, orderId);
  if (!after.order || !after.status) {
    console.warn("[remind] order missing after schedule", { orderId });
    return { ok: false, status: "not_found" };
  }

  if (after.status === "confirmed") {
    await cancelAdminApprovalReminders(db, orderId);
    await logAlreadyApprovedAttempt(db, orderId, context);
    console.info("[remind] order confirmed during schedule — reminders cancelled", { orderId });
    return { ok: true, status: "already_approved", order: after.order };
  }

  if (!isAwaitingOrderApproval(after.status)) {
    await cancelAdminApprovalReminders(db, orderId);
    console.warn("[remind] order no longer awaiting after schedule", {
      orderId,
      status: after.status
    });
    return { ok: false, status: "not_awaiting" };
  }

  await logOrderAction(db, {
    orderId,
    action: "remind_later",
    performedBy: context.performedBy,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });

  console.info("[remind] completed successfully", {
    orderId,
    remindAt: scheduled.remindAt
  });

  return { ok: true, status: "scheduled", order: after.order, remindAt: scheduled.remindAt };
}
