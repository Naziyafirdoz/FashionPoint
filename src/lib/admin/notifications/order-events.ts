import { customerName } from "@/lib/orders/admin-orders";
import { buildNewOrderAlertContent } from "@/lib/notifications/order-alert-content";
import { requiresCustomerCancellationRefund } from "@/lib/orders/cancellation";
import { refundAmountForOrder } from "@/lib/orders/refunds";
import { isCancellationRefundWorkflowEnabled } from "@/lib/store-policy";
import {
  hasNotification,
  notificationDedupKey
} from "@/lib/admin/notifications/storage";
import type { AdminNotification, AdminNotificationType } from "@/lib/admin/notifications/types";
import type { Order } from "@/types";

function formatCurrency(amount: number): string {
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

export function parseOrderRow(row: Record<string, unknown>): Order {
  return row as unknown as Order;
}

export function detectNotificationEvents(
  event: "INSERT" | "UPDATE",
  order: Order,
  previous?: Order | null
): AdminNotificationType[] {
  const types: AdminNotificationType[] = [];

  if (event === "INSERT") {
    return types;
  }

  if (!previous) {
    return [];
  }

  if (isCancellationRefundWorkflowEnabled()) {
    const prevPayment = (previous.payment_status ?? "").toLowerCase();
    const nextPayment = (order.payment_status ?? "").toLowerCase();
    const prevStatus = previous.status;

    if (order.status === "cancel_requested" && prevStatus !== "cancel_requested") {
      types.push("customer_cancelled");
    }

    if (order.status === "cancelled" && prevStatus !== "cancelled") {
      if (requiresCustomerCancellationRefund(order)) {
        types.push("customer_cancelled");
      }
    }

    if (nextPayment === "refund_pending" && prevPayment !== "refund_pending" && prevStatus !== "cancelled") {
      types.push("refund_pending");
    }

    if (nextPayment === "refunded" && prevPayment === "refund_pending") {
      types.push("refund_completed");
    }
  }

  return types;
}

export function buildNotification(
  type: AdminNotificationType,
  order: Order
): AdminNotification {
  const id = notificationDedupKey(order.id, type);
  const name = customerName(order);
  const amount = Number(order.total) || 0;
  const refundAmount = refundAmountForOrder(order);

  if (type === "new_order") {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      "http://localhost:3000";
    const alert = buildNewOrderAlertContent(order, baseUrl);
    return {
      id,
      type,
      orderId: order.id,
      orderNumber: order.order_number,
      title: alert.title,
      message: alert.lines.join("\n"),
      amount,
      read: false,
      createdAt: new Date().toISOString()
    };
  }

  if (type === "refund_pending") {
    return {
      id,
      type,
      orderId: order.id,
      orderNumber: order.order_number,
      title: "Refund Request Received",
      message: `${order.order_number} · ${formatCurrency(refundAmount)}`,
      amount: refundAmount,
      read: false,
      createdAt: new Date().toISOString()
    };
  }

  if (type === "customer_cancelled") {
    return {
      id,
      type,
      orderId: order.id,
      orderNumber: order.order_number,
      title: "Customer Cancelled Order",
      message: [
        `Order ${order.order_number} has been cancelled by the customer before shipment.`,
        "",
        `Refund Amount: ${formatCurrency(refundAmount)}`,
        "Refund Method: Original Payment Method",
        "Recommended Refund Timeline: Within 5 Business Days"
      ].join("\n"),
      amount: refundAmount,
      priority: "high",
      actionLabel: "View Cancelled Order",
      read: false,
      createdAt: new Date().toISOString()
    };
  }

  if (type === "refund_completed") {
    return {
      id,
      type,
      orderId: order.id,
      orderNumber: order.order_number,
      title: "Refund Completed",
      message: `Refund completed for order ${order.order_number}.`,
      amount: refundAmount,
      read: false,
      createdAt: new Date().toISOString()
    };
  }

  if (type === "worker_packed") {
    return {
      id,
      type,
      orderId: order.id,
      orderNumber: order.order_number,
      title: "Order Packed",
      message: `Worker has packed Order ${order.order_number}.\nReady for shipping.`,
      read: false,
      createdAt: new Date().toISOString()
    };
  }

  if (type === "ready_for_dispatch") {
    return {
      id,
      type,
      orderId: order.id,
      orderNumber: order.order_number,
      title: "Ready For Dispatch",
      message: `Order ${order.order_number} is ready for dispatch.`,
      read: false,
      createdAt: new Date().toISOString()
    };
  }

  return {
    id,
    type,
    orderId: order.id,
    orderNumber: order.order_number,
    title: "Order Cancelled",
    message: order.order_number,
    read: false,
    createdAt: new Date().toISOString()
  };
}

export function shouldEmitNotification(type: AdminNotificationType, order: Order): boolean {
  const id = notificationDedupKey(order.id, type);
  return !hasNotification(id);
}
