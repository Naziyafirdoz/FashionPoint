/**
 * @deprecated Return workflow UI is disabled. Legacy `return_requests` table remains unused.
 * Returns, exchanges, and refund workflows are intentionally disabled per client requirements.
 * Do not re-enable without explicit business approval.
 */
import type { ReturnReason, ReturnStatus } from "@/types";

export const RETURN_REASONS: { value: ReturnReason; label: string }[] = [
  { value: "wrong_product", label: "Wrong Product" },
  { value: "damaged_product", label: "Damaged Product" },
  { value: "size_issue", label: "Size Issue" },
  { value: "quality_issue", label: "Quality Issue" },
  { value: "other", label: "Other" }
];

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  return_requested: "Return Requested",
  return_approved: "Return Approved",
  pickup_scheduled: "Pickup Scheduled",
  picked_up: "Picked Up",
  returned: "Returned",
  refund_pending: "Refund Pending",
  refunded: "Refunded"
};

export const RETURN_STATUS_FLOW: ReturnStatus[] = [
  "return_requested",
  "return_approved",
  "pickup_scheduled",
  "picked_up",
  "returned",
  "refund_pending",
  "refunded"
];

const VALID_RETURN_REASONS = new Set<string>(RETURN_REASONS.map((r) => r.value));
const VALID_RETURN_STATUSES = new Set<string>(RETURN_STATUS_FLOW);

export function isValidReturnReason(value: unknown): value is ReturnReason {
  return typeof value === "string" && VALID_RETURN_REASONS.has(value);
}

export function returnReasonLabel(reason: ReturnReason | string): string {
  return RETURN_REASONS.find((r) => r.value === reason)?.label ?? reason;
}

export function returnStatusLabel(status: ReturnStatus | string): string {
  return RETURN_STATUS_LABELS[status as ReturnStatus] ?? status;
}

export function isValidReturnStatus(value: unknown): value is ReturnStatus {
  return typeof value === "string" && VALID_RETURN_STATUSES.has(value);
}

export function isReturnTableError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    msg.includes("return_requests") ||
    msg.includes("schema cache") ||
    error.code === "PGRST204" ||
    error.code === "42P01"
  );
}

export const RETURN_MIGRATION_UNAVAILABLE =
  "Return request database migration not applied.";
