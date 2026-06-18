import { isCancelledAwaitingRefund } from "@/lib/orders/cancellation";
import type { Order } from "@/types";

/** @deprecated Use isCancelledAwaitingRefund — kept for stats compatibility. */
export function isPendingCancellationRequest(
  order: Pick<Order, "status" | "payment_status" | "payment_method" | "refund_status">
): boolean {
  return isCancelledAwaitingRefund(order);
}

export function countPendingCancellationRequests(
  orders: Pick<Order, "status" | "payment_status" | "payment_method">[]
): number {
  return orders.filter(isPendingCancellationRequest).length;
}
