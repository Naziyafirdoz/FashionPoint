import type { OrderStatus } from "@/types";

export const PREPAID_PAYMENT_METHODS = new Set(["upi", "card", "netbanking", "wallet"]);

export function isCodPayment(method: string | undefined): boolean {
  return method === "cod";
}

export function isPrepaidPayment(method: string | undefined): boolean {
  if (!method) return true;
  return !isCodPayment(method);
}

/**
 * Resolves payment_status from order status + payment method per business rules.
 */
export function resolvePaymentStatus(
  orderStatus: OrderStatus,
  paymentMethod: string | undefined,
  currentPaymentStatus: string | undefined
): string {
  const current = (currentPaymentStatus ?? "pending").toLowerCase();
  const method = paymentMethod ?? "upi";

  if (orderStatus === "delivered" && isCodPayment(method)) {
    return "paid";
  }

  if (orderStatus === "pending" && isCodPayment(method)) {
    return "pending";
  }

  if (orderStatus === "cancel_requested" || orderStatus === "cancellation_approved") {
    if (isPrepaidPayment(method)) {
      if (current === "refund_pending" || current === "refunded") return current;
      return "paid";
    }
    return current;
  }

  if (orderStatus === "cancelled") {
    if (isCodPayment(method)) {
      return current === "failed" ? "failed" : "pending";
    }
    if (current === "refunded") return "refunded";
    if (current === "refund_pending") return "refund_pending";
    if (current === "paid") return "refund_pending";
    return current;
  }

  if (isCodPayment(method)) {
    if (current === "paid" && orderStatus !== "delivered") {
      return "pending";
    }
    if (current === "failed") return "failed";
    return "pending";
  }

  if (isPrepaidPayment(method)) {
    if (current === "refund_pending" || current === "refunded") {
      return current;
    }
    if (current === "paid") return "paid";
    if (current === "failed") return "failed";
    return current === "pending" ? "pending" : current;
  }

  return current;
}

export function isInvalidPaymentCombination(
  orderStatus: OrderStatus,
  paymentMethod: string | undefined,
  paymentStatus: string | undefined
): boolean {
  const method = paymentMethod ?? "upi";
  const payment = (paymentStatus ?? "pending").toLowerCase();

  if (orderStatus === "cancelled" && isPrepaidPayment(method) && payment === "paid") {
    return true;
  }
  if (orderStatus === "delivered" && isCodPayment(method) && payment === "pending") {
    return true;
  }
  if (isCodPayment(method) && payment === "paid" && orderStatus !== "delivered") {
    return true;
  }

  return false;
}

export function applyPaymentRulesToOrder<T extends {
  status: OrderStatus;
  payment_method?: string;
  payment_status: string;
}>(order: T): T {
  const payment_status = resolvePaymentStatus(
    order.status,
    order.payment_method,
    order.payment_status
  ) as T["payment_status"];

  if (payment_status === order.payment_status) return order;
  return { ...order, payment_status };
}
