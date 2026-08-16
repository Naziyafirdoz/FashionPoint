type LogLevel = "info" | "warn" | "error";

export type WorkflowEvent =
  | "payment_verify_start"
  | "payment_verify_signature"
  | "payment_verify_order_loaded"
  | "payment_verify_idempotent"
  | "payment_verify_success"
  | "payment_verify_failed"
  | "payment_webhook_start"
  | "payment_webhook_success"
  | "payment_webhook_idempotent"
  | "payment_webhook_failed"
  | "order_finalize_start"
  | "order_finalize_status_updated"
  | "order_finalize_stock_deducted"
  | "order_finalize_shipment_created"
  | "order_finalize_failed"
  | "customer_email_start"
  | "customer_email_sent"
  | "customer_email_skipped"
  | "customer_email_failed"
  | "admin_email_start"
  | "admin_email_sent"
  | "admin_email_skipped"
  | "admin_email_failed"
  | "dashboard_notification_created"
  | "dashboard_notification_failed"
  | "order_status_transition"
  | "order_approval_start"
  | "order_approval_success"
  | "order_approval_failed";

export function logWorkflow(
  event: WorkflowEvent,
  data: Record<string, unknown>,
  level: LogLevel = "info"
): void {
  const payload = {
    ts: new Date().toISOString(),
    event,
    ...data
  };

  if (level === "error") {
    console.error("[workflow]", payload);
    return;
  }

  if (level === "warn") {
    console.warn("[workflow]", payload);
    return;
  }

  console.info("[workflow]", payload);
}
