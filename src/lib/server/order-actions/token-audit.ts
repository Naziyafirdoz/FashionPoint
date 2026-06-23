import type { SupabaseClient } from "@supabase/supabase-js";
import { logOrderAction, type OrderActionLogContext } from "@/lib/server/order-actions/audit-log";
import type { TokenValidationFailure } from "@/lib/server/order-actions/tokens";

export async function logTokenValidationFailure(
  db: SupabaseClient,
  failure: TokenValidationFailure,
  context: OrderActionLogContext
): Promise<void> {
  if (!failure.record?.order_id) return;

  const action =
    failure.reason === "used"
      ? "token_used"
      : failure.reason === "expired"
        ? "token_expired"
        : "invalid_token";

  await logOrderAction(db, {
    orderId: failure.record.order_id,
    action,
    performedBy: context.performedBy,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });
}
