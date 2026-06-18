import { isPrepaidPayment } from "@/lib/orders/payment-rules";
import { refundAmountForOrder } from "@/lib/orders/refunds";
import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import type { Order, OrderStatus } from "@/types";

export type ManualRefundMethod = "upi" | "bank_account" | "qr_code";

export type CustomerRefundDetailsInput = {
  cancellation_reason?: string;
  refund_method?: string;
  refund_upi_id?: string;
  refund_bank_holder_name?: string;
  refund_bank_account_number?: string;
  refund_bank_ifsc?: string;
  refund_bank_name?: string;
  refund_qr_image_url?: string;
};

export const MANUAL_REFUND_STATUS = {
  DETAILS_SUBMITTED: "refund_details_submitted",
  PENDING: "refund_pending",
  REFUNDED: "refunded"
} as const;

export const MANUAL_ORDER_STATUS = {
  CANCEL_REQUESTED: "cancel_requested",
  CANCELLATION_APPROVED: "cancellation_approved"
} as const;

export function isManualRefundOrder(
  order: Pick<Order, "status" | "refund_status" | "payment_method">
): boolean {
  if (!isPrepaidPayment(order.payment_method ?? undefined)) return false;
  const status = order.status as string;
  const refundStatus = (order.refund_status ?? "").toLowerCase();
  return (
    status === MANUAL_ORDER_STATUS.CANCEL_REQUESTED ||
    status === MANUAL_ORDER_STATUS.CANCELLATION_APPROVED ||
    refundStatus === MANUAL_REFUND_STATUS.DETAILS_SUBMITTED ||
    refundStatus === MANUAL_REFUND_STATUS.PENDING ||
    refundStatus === MANUAL_REFUND_STATUS.REFUNDED
  );
}

export function isCancelRequestedOrder(order: Pick<Order, "status">): boolean {
  return (order.status as string) === MANUAL_ORDER_STATUS.CANCEL_REQUESTED;
}

export function isCancellationApprovedOrder(order: Pick<Order, "status">): boolean {
  return (order.status as string) === MANUAL_ORDER_STATUS.CANCELLATION_APPROVED;
}

export function refundMethodLabel(method: string | undefined | null): string {
  switch ((method ?? "").toLowerCase()) {
    case "upi":
      return "UPI";
    case "bank_account":
      return "Bank Account";
    case "qr_code":
      return "QR Code";
    default:
      return method?.trim() || "—";
  }
}

export function manualRefundStatusLabel(refundStatus: string | undefined | null): string {
  switch ((refundStatus ?? "").toLowerCase()) {
    case MANUAL_REFUND_STATUS.DETAILS_SUBMITTED:
      return "Refund Details Submitted";
    case MANUAL_REFUND_STATUS.PENDING:
      return "Refund Pending";
    case MANUAL_REFUND_STATUS.REFUNDED:
      return "Refunded";
    case "initiated":
      return "Initiated";
    case "completed":
      return "Refunded";
    default:
      return refundStatus?.replace(/_/g, " ") || "—";
  }
}

export function manualOrderStatusLabel(status: string): string {
  if (status === MANUAL_ORDER_STATUS.CANCEL_REQUESTED) return "Cancel Requested";
  if (status === MANUAL_ORDER_STATUS.CANCELLATION_APPROVED) return "Cancellation Approved";
  return status.replace(/_/g, " ");
}

export function paidAmountForOrder(order: Pick<Order, "total" | "payment_status">): number {
  if ((order.payment_status ?? "").toLowerCase() === "paid") {
    return Number(order.total) || 0;
  }
  return Number(order.total) || 0;
}

export function validateCustomerRefundDetails(
  input: CustomerRefundDetailsInput
): { ok: true; method: ManualRefundMethod; payload: Record<string, unknown> } | { ok: false; error: string } {
  const method = (input.refund_method ?? "").trim().toLowerCase();
  if (!method || !["upi", "bank_account", "qr_code"].includes(method)) {
    return { ok: false, error: "Please select a refund method." };
  }

  const payload: Record<string, unknown> = {
    refund_method: method,
    refund_upi_id: null,
    refund_bank_holder_name: null,
    refund_bank_account_number: null,
    refund_bank_ifsc: null,
    refund_bank_name: null,
    refund_qr_image_url: null
  };

  if (method === "upi") {
    const upiId = input.refund_upi_id?.trim() ?? "";
    if (!upiId) return { ok: false, error: "UPI ID is required." };
    payload.refund_upi_id = upiId;
  }

  if (method === "bank_account") {
    const holder = input.refund_bank_holder_name?.trim() ?? "";
    const account = input.refund_bank_account_number?.trim() ?? "";
    const ifsc = input.refund_bank_ifsc?.trim().toUpperCase() ?? "";
    const bank = input.refund_bank_name?.trim() ?? "";
    if (!holder) return { ok: false, error: "Account holder name is required." };
    if (!account) return { ok: false, error: "Account number is required." };
    if (!ifsc) return { ok: false, error: "IFSC code is required." };
    if (!bank) return { ok: false, error: "Bank name is required." };
    payload.refund_bank_holder_name = holder;
    payload.refund_bank_account_number = account;
    payload.refund_bank_ifsc = ifsc;
    payload.refund_bank_name = bank;
  }

  if (method === "qr_code") {
    const qrUrl = input.refund_qr_image_url?.trim() ?? "";
    if (!qrUrl) return { ok: false, error: "QR code image is required." };
    payload.refund_qr_image_url = qrUrl;
  }

  return { ok: true, method: method as ManualRefundMethod, payload };
}

export function buildPrepaidCancelRequestPayload(input: {
  order: Order;
  cancellationReason?: string;
  refundDetails: Record<string, unknown>;
}): Record<string, unknown> {
  const now = new Date().toISOString();
  const reason = input.cancellationReason?.trim();

  return {
    status: MANUAL_ORDER_STATUS.CANCEL_REQUESTED satisfies OrderStatus,
    payment_status: "paid",
    refund_status: MANUAL_REFUND_STATUS.DETAILS_SUBMITTED,
    refund_amount: refundAmountForOrder(input.order),
    cancel_requested_at: now,
    updated_at: now,
    ...(reason ? { cancellation_reason: reason } : {}),
    ...input.refundDetails
  };
}

export function canAdminApproveCancellation(order: Order): boolean {
  return isCancelRequestedOrder(order) && isPrepaidPayment(order.payment_method);
}

export function canAdminRejectCancellation(order: Order): boolean {
  return isCancelRequestedOrder(order);
}

export function canAdminMarkManualRefundCompleted(order: Order): boolean {
  return (
    isCancellationApprovedOrder(order) &&
    isPrepaidPayment(order.payment_method) &&
    (order.refund_status ?? "").toLowerCase() === MANUAL_REFUND_STATUS.PENDING &&
    order.payment_status === "refund_pending"
  );
}

export function buildApproveCancellationPayload(order: Order): Record<string, unknown> {
  const now = new Date().toISOString();
  const amount = refundAmountForOrder(order);

  return {
    status: MANUAL_ORDER_STATUS.CANCELLATION_APPROVED satisfies OrderStatus,
    payment_status: "refund_pending",
    refund_status: MANUAL_REFUND_STATUS.PENDING,
    refund_amount: amount,
    refund_initiated_at: order.refund_initiated_at ?? now,
    cancelled_at: order.cancelled_at ?? now,
    updated_at: now
  };
}

export function buildRejectCancellationPayload(): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    status: "processing" satisfies OrderStatus,
    payment_status: "paid",
    refund_status: null,
    refund_method: null,
    refund_upi_id: null,
    refund_bank_holder_name: null,
    refund_bank_account_number: null,
    refund_bank_ifsc: null,
    refund_bank_name: null,
    refund_qr_image_url: null,
    cancellation_reason: null,
    updated_at: now
  };
}

export function buildManualRefundCompletedPayload(
  order: Order,
  input: { refund_reference: string; refund_notes?: string },
  adminUserId: string
): Record<string, unknown> {
  const now = new Date().toISOString();
  const amount = refundAmountForOrder(order);
  const reference = input.refund_reference.trim();

  return {
    status: "cancelled" satisfies OrderStatus,
    payment_status: "refunded",
    refund_status: MANUAL_REFUND_STATUS.REFUNDED,
    refund_amount: amount,
    refund_date: now,
    refund_completed_at: now,
    refund_reference: reference,
    refund_notes: input.refund_notes?.trim() || null,
    refund_initiated_at: order.refund_initiated_at ?? now,
    refunded_by: adminUserId,
    cancelled_at: order.cancelled_at ?? now,
    updated_at: now
  };
}

export function shouldShowManualRefundSection(order: Order): boolean {
  if (!isPrepaidPayment(order.payment_method)) return false;
  return (
    isCancelRequestedOrder(order) ||
    isCancellationApprovedOrder(order) ||
    (normalizeLegacyStatus(order.status) === "cancelled" && isManualRefundOrder(order))
  );
}

export const QR_REFUND_ACCEPT = ".jpg,.jpeg,.png,.webp";
export const QR_REFUND_HELPER_TEXT =
  "Please upload only the QR code used to receive refunds. Product photos or unrelated images may delay refund processing.";
export const QR_REFUND_INVALID_MESSAGE =
  "No valid QR code detected. Please upload a UPI QR code image.";

const ALLOWED_QR_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const ALLOWED_QR_EXT = /\.(jpe?g|png|webp)$/i;

export function isAllowedQrRefundImage(file: File): boolean {
  const type = file.type.toLowerCase();
  if (ALLOWED_QR_MIME.has(type)) return true;
  return ALLOWED_QR_EXT.test(file.name);
}

export function validateManualRefundCompletion(
  input: { refund_reference?: string; refund_notes?: string }
): { ok: true; reference: string } | { ok: false; error: string } {
  const reference = input.refund_reference?.trim() ?? "";
  if (!reference) {
    return { ok: false, error: "Transaction Reference / UTR Number is required." };
  }
  return { ok: true, reference };
}

export function customerCancelRequestMessage(): string {
  return "Your cancellation request has been submitted. We will review it and process your refund after approval.";
}
