import type { SupabaseClient } from "@supabase/supabase-js";

export type OrderActionLogType =
  | "approved"
  | "already_approved"
  | "token_used"
  | "token_expired"
  | "invalid_token";

export type OrderActionLogContext = {
  performedBy?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function logOrderAction(
  db: SupabaseClient,
  input: {
    orderId: string;
    action: OrderActionLogType;
    performedBy?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }
): Promise<void> {
  const { error } = await db.from("order_action_logs").insert({
    order_id: input.orderId,
    action: input.action,
    performed_by: input.performedBy ?? null,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null
  });

  if (error) {
    if (error.code === "23505" && input.action === "approved") {
      return;
    }
    console.error("[order-action-log] insert failed", {
      orderId: input.orderId,
      action: input.action,
      message: error.message
    });
  }
}

export async function hasApprovedAuditLog(
  db: SupabaseClient,
  orderId: string
): Promise<boolean> {
  const { data } = await db
    .from("order_action_logs")
    .select("id")
    .eq("order_id", orderId)
    .eq("action", "approved")
    .maybeSingle();
  return Boolean(data);
}

export async function logAlreadyApprovedAttempt(
  db: SupabaseClient,
  orderId: string,
  context: OrderActionLogContext
): Promise<void> {
  await logOrderAction(db, {
    orderId,
    action: "already_approved",
    performedBy: context.performedBy,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });
}
