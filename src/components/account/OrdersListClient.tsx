"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CancelOrderModal, orderIsPrepaidForCancel, type CancelOrderSubmitPayload } from "@/components/account/CancelOrderModal";
import { CustomerCancelledOrderSection } from "@/components/account/CustomerCancelledOrderSection";
import { applyPaymentRulesToOrder } from "@/lib/orders/payment-rules";
import { canCustomerCancelOrder } from "@/lib/orders/customer-orders";
import { getCustomerFacingStatusLabel } from "@/lib/orders/fulfillment-workflow";
import {
  downloadInvoicePdf,
  getStatusFlatClass,
  formatCurrency,
  formatOrderDate,
  formatOrderTime,
  paymentMethodLabel,
  paymentStatusLabel
} from "@/lib/orders/admin-orders";
import { normalizeOrderItems, formatOrderItemPriceLine } from "@/lib/orders/order-items";
import {
  CUSTOMER_ORDER_STATUS_MESSAGE,
  resolveCustomerDeliveryEstimate,
  shouldShowCustomerOrderStatusMessage
} from "@/lib/orders/customer-order-display";
import { RETURNS_EXCHANGES_REFUNDS_DISABLED } from "@/lib/store-policy";
import type { UserReviewPreview } from "@/lib/reviews/types";
import type { Order } from "@/types";
import { OrderReviewButton } from "@/components/reviews/OrderReviewButton";
import { useCustomerOrdersRealtime } from "@/lib/orders/use-customer-orders-realtime";

type OrdersListClientProps = {
  orders: Order[];
  userId: string;
};

function customerPaymentLabel(order: Order): string {
  if (!RETURNS_EXCHANGES_REFUNDS_DISABLED) {
    return paymentStatusLabel(order.payment_status);
  }
  const status = (order.payment_status ?? "").toLowerCase();
  if (status === "refund_pending" || status === "refunded") {
    return "Paid";
  }
  return paymentStatusLabel(order.payment_status);
}

export function OrdersListClient({ orders: initialOrders, userId }: OrdersListClientProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [userReviews, setUserReviews] = useState<UserReviewPreview[]>([]);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  useCustomerOrdersRealtime(userId, setOrders);

  const loadReviews = useCallback(async () => {
    try {
      const res = await fetch("/api/reviews?mine=true");
      if (!res.ok) return;
      const data = await res.json();
      setUserReviews(data.reviews ?? []);
    } catch {
      setUserReviews([]);
    }
  }, []);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const reviewByProductId = useMemo(() => {
    const map = new Map<string, UserReviewPreview>();
    for (const review of userReviews) {
      if (!map.has(review.product_id)) {
        map.set(review.product_id, review);
      }
    }
    return map;
  }, [userReviews]);

  const handleConfirmCancel = async (payload: CancelOrderSubmitPayload) => {
    if (!cancelTarget || cancelLoading) return;

    setCancelLoading(true);
    try {
      const res = await fetch(`/api/orders/${cancelTarget.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        order?: Order;
      };

      if (!res.ok) {
        toast.error(data.error ?? "Unable to cancel order");
        return;
      }

      if (data.order) {
        setOrders((prev) => prev.map((row) => (row.id === data.order!.id ? data.order! : row)));
      }

      toast.success(data.message ?? "Your order has been cancelled.");
      setCancelTarget(null);
    } catch {
      toast.error("Unable to cancel order. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  };

  if (!orders.length) {
    return <p className="mt-4 text-foreground/70">You haven&apos;t placed any orders yet.</p>;
  }

  return (
    <>
      <div className="mt-8 space-y-4">
        {orders.map((order) => {
          const normalized = applyPaymentRulesToOrder(order);
          const items = normalizeOrderItems(normalized.items);
          const isDelivered = normalized.status === "delivered";
          const isCancelled = normalized.status === "cancelled";
          const isCancelPending =
            normalized.status === "cancel_requested" ||
            normalized.status === "cancellation_approved";
          const canCancel = canCustomerCancelOrder(normalized);
          const deliveryEstimate = resolveCustomerDeliveryEstimate(normalized);
          const showOrderStatusMessage = shouldShowCustomerOrderStatusMessage(normalized);
          const showReviewPending =
            !isCancelled &&
            (normalized.status === "pending" ||
              normalized.status === "processing" ||
              normalized.status === "ready_to_ship" ||
              normalized.status === "out_for_delivery" ||
              (normalized.status as string) === "shipped");

          return (
            <div key={order.id} className="card-store">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-accent/10 pb-4">
                <div>
                  <p className="font-semibold text-primary">{order.order_number}</p>
                  <p className="mt-1 text-sm text-foreground/70">
                    {formatOrderDate(order.created_at)}
                    <span className="text-foreground/50"> · {formatOrderTime(order.created_at)}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full bg-blush px-2 py-0.5 text-xs font-medium text-foreground/70`}
                    >
                      {customerPaymentLabel(normalized)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusFlatClass(normalized)}`}
                    >
                      {getCustomerFacingStatusLabel(normalized)}
                    </span>
                    {normalized.payment_method ? (
                      <span className="rounded-full bg-blush px-2 py-0.5 text-xs text-foreground/70">
                        {paymentMethodLabel(normalized.payment_method)}
                      </span>
                    ) : null}
                  </div>
                  {deliveryEstimate ? (
                    <p className="mt-2 text-sm text-foreground/70">
                      <span className="font-medium text-foreground">Estimated Delivery:</span>{" "}
                      {deliveryEstimate}
                    </p>
                  ) : null}
                  {showOrderStatusMessage ? (
                    <p className="mt-2 text-sm text-foreground/60">{CUSTOMER_ORDER_STATUS_MESSAGE}</p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(Number(order.total))}
                  </p>
                  <p className="text-xs text-foreground/50">Total Amount</p>
                  <p className="mt-1 text-xs text-foreground/60">
                    Shipping: {formatCurrency(Number(normalized.shipping_amount))}
                  </p>
                </div>
              </div>

              <CustomerCancelledOrderSection order={normalized} />

              {items.length > 0 ? (
                <ul className="mt-4 space-y-4">
                  {items.map((item, index) => {
                    const productId = item.productId;

                    return (
                      <li
                        key={`${order.id}-${productId}-${item.size}-${index}`}
                        className="flex flex-col gap-3 sm:flex-row sm:items-start"
                      >
                        <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg border bg-blush/30">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-[10px] text-foreground/40">
                              —
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground">{item.name}</p>
                          <p className="mt-0.5 text-xs text-foreground/50">
                            SKU: {item.sku?.trim() || "—"}
                          </p>
                          <p className="mt-1 text-sm text-foreground/60">
                            Size: {item.size} · Color: {item.color} · Qty: {item.quantity}
                          </p>
                          <p className="mt-1 text-sm font-medium">
                            {formatOrderItemPriceLine(item, formatCurrency)}
                          </p>
                          {showReviewPending && productId ? (
                            <p className="mt-2 text-sm text-foreground/60">
                              You can review this product after delivery.
                            </p>
                          ) : null}
                        </div>
                        {isDelivered && productId ? (
                          <OrderReviewButton
                            productId={productId}
                            productName={item.name}
                            orderId={order.id}
                            size={item.size}
                            color={item.color}
                            userReview={reviewByProductId.get(productId) ?? null}
                            onReviewChange={loadReviews}
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-foreground/60">No items recorded for this order.</p>
              )}

              <div className="mt-4 flex flex-wrap gap-3 border-t border-accent/10 pt-4">
                <button
                  type="button"
                  onClick={() => downloadInvoicePdf(normalized)}
                  className="rounded-lg border border-primary/30 bg-blush px-4 py-2 text-sm font-medium text-primary"
                >
                  Download Invoice
                </button>
                {canCancel ? (
                  <button
                    type="button"
                    onClick={() => setCancelTarget(normalized)}
                    disabled={cancelLoading}
                    className="rounded-lg border border-red-500 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    Cancel Order
                  </button>
                ) : null}
                {isCancelled ? (
                  <p className="self-center text-sm text-foreground/60">
                    This order has been cancelled.
                  </p>
                ) : isCancelPending ? (
                  <p className="self-center text-sm text-foreground/60">
                    Cancellation request submitted — awaiting store review.
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <CancelOrderModal
        open={cancelTarget != null}
        orderNumber={cancelTarget?.order_number ?? ""}
        isPrepaid={orderIsPrepaidForCancel(cancelTarget?.payment_method)}
        loading={cancelLoading}
        onConfirm={(payload) => void handleConfirmCancel(payload)}
        onCancel={() => {
          if (!cancelLoading) setCancelTarget(null);
        }}
      />
    </>
  );
}
