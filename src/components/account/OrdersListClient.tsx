"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { CancelOrderModal, orderIsPrepaidForCancel, type CancelOrderSubmitPayload } from "@/components/account/CancelOrderModal";
import { CustomerCancelledOrderSection } from "@/components/account/CustomerCancelledOrderSection";
import { applyPaymentRulesToOrder } from "@/lib/orders/payment-rules";
import { canCustomerCancelOrder } from "@/lib/orders/customer-orders";
import { getCustomerFacingStatusLabel } from "@/lib/orders/fulfillment-workflow";
import { getCustomerShipmentSummary } from "@/lib/orders/customer-shipment-display";
import { downloadInvoicePdf } from "@/lib/orders/admin-order-invoice";
import {
  formatCurrency,
  formatOrderDate,
  formatOrderTime,
  paymentMethodLabel,
  paymentStatusLabel
} from "@/lib/orders/admin-orders";
import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import {
  normalizeOrderItems,
  formatOrderItemPriceValue
} from "@/lib/orders/order-items";
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
import { useCustomerOrdersFetch } from "@/lib/orders/use-customer-orders-fetch";
import { useCustomerAuthReady } from "@/lib/auth/use-customer-auth-ready";

type OrdersListClientProps = {
  orders: Order[];
  userId: string;
  storeName: string;
  storeAddress: string;
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

function MetaBadge({
  label,
  variant
}: {
  label: string;
  variant: "green" | "blue";
}) {
  const variantClass =
    variant === "green"
      ? "border-green-200 bg-green-50 text-green-700"
      : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${variantClass}`}
    >
      {label}
    </span>
  );
}

function getShippingAmount(order: Order): number {
  const withShippingCharge = order as Order & { shipping_charge?: number | string | null };

  if (withShippingCharge.shipping_charge != null && Number(withShippingCharge.shipping_charge) > 0) {
    return Number(withShippingCharge.shipping_charge);
  }

  const pincode =
    order.shipping_address?.pincode || order.shipping_address?.postal_code || "";

  if (String(pincode).startsWith("520")) {
    return 99;
  }

  return 200;
}

function getCustomerOrderStatusBadgeClass(order: Order): string {
  const status = normalizeLegacyStatus(order.status);
  switch (status) {
    case "processing":
    case "pending":
      return "border-yellow-200 bg-yellow-100 text-yellow-800";
    case "confirmed":
      return "border-green-200 bg-green-100 text-green-700";
    case "packing_assigned":
    case "packed":
      return "border-transparent bg-[#E8F1FF] text-[#3B82F6]";
    case "ready_to_ship":
      return "border-purple-200 bg-purple-100 text-purple-700";
    case "shipped":
    case "out_for_delivery":
      return "border-violet-200 bg-violet-100 text-violet-700";
    case "delivered":
      return "border-emerald-200 bg-emerald-100 text-emerald-700";
    case "cancelled":
    case "cancel_requested":
    case "cancellation_approved":
      return "border-red-200 bg-red-100 text-red-700";
    default:
      return "border-gray-200 bg-gray-100 text-gray-700";
  }
}

const ORDER_CARD_CLASS =
  "w-full max-w-[780px] rounded-2xl border border-[#F3D6DD] bg-[#FFFDFD] p-[18px] shadow-[0_2px_10px_rgba(123,13,43,0.05)]";

const ORDER_ACTION_BUTTON_CLASS =
  "inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-white px-4 text-sm font-medium transition";

export function OrdersListClient({
  orders: initialOrders,
  userId,
  storeName: initialStoreName,
  storeAddress: initialStoreAddress
}: OrdersListClientProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [storeInfo, setStoreInfo] = useState({
    storeName: initialStoreName,
    address: initialStoreAddress
  });
  const [userReviews, setUserReviews] = useState<UserReviewPreview[]>([]);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const refetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reviewsLoadedKeyRef = useRef<string | null>(null);
  const reviewsFetchFailedRef = useRef(false);
  const reviewsInFlightRef = useRef(false);

  const authReady = useCustomerAuthReady();
  const hasSsrOrders = initialOrders.length > 0;

  const onStoreInfo = useCallback((store: { storeName: string; address: string }) => {
    setStoreInfo(store);
  }, []);

  const { fetchOrders, isLoading } = useCustomerOrdersFetch(setOrders, {
    hasInitialData: hasSsrOrders,
    enabled: hasSsrOrders || authReady,
    onStoreInfo
  });

  // Seed from SSR once. Do not re-apply initialOrders after client fetch/realtime
  // has updated status — that would flash stale "Processing" over "Shipped".
  useEffect(() => {
    if (!hasSsrOrders) return;
    console.info("[orders] using SSR orders", { count: initialOrders.length });
    setOrders(initialOrders);
    // intentionally mount-only
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid overwriting live client state
  }, []);

  const scheduleRefetch = useCallback(() => {
    console.info("[orders] realtime sync");
    if (refetchDebounceRef.current) {
      clearTimeout(refetchDebounceRef.current);
    }
    refetchDebounceRef.current = setTimeout(() => {
      void fetchOrders({ background: true });
    }, 400);
  }, [fetchOrders]);

  useEffect(() => {
    return () => {
      if (refetchDebounceRef.current) {
        clearTimeout(refetchDebounceRef.current);
      }
    };
  }, []);

  useCustomerOrdersRealtime(userId, setOrders, { onSyncSignal: scheduleRefetch });

  const reviewProductIdsKey = useMemo(() => {
    const ids = new Set<string>();
    for (const order of orders) {
      if (order.status !== "delivered") continue;
      for (const item of normalizeOrderItems(order.items)) {
        if (item.productId) ids.add(item.productId);
      }
    }
    return [...ids].sort().join(",");
  }, [orders]);

  const refreshReviews = useCallback(async () => {
    if (!authReady || !reviewProductIdsKey || reviewsInFlightRef.current) return;

    reviewsLoadedKeyRef.current = null;
    reviewsFetchFailedRef.current = false;
    reviewsInFlightRef.current = true;

    try {
      const res = await fetch(
        `/api/reviews?mine=true&product_ids=${encodeURIComponent(reviewProductIdsKey)}`,
        {
          cache: "no-store",
          credentials: "include"
        }
      );
      if (!res.ok) {
        reviewsFetchFailedRef.current = true;
        return;
      }
      const data = (await res.json()) as { reviews?: UserReviewPreview[] };
      setUserReviews(data.reviews ?? []);
      reviewsLoadedKeyRef.current = reviewProductIdsKey;
    } catch (err) {
      reviewsFetchFailedRef.current = true;
      console.error("[reviews] failed", err);
    } finally {
      reviewsInFlightRef.current = false;
    }
  }, [authReady, reviewProductIdsKey]);

  useEffect(() => {
    if (!authReady) return;
    if (!reviewProductIdsKey) {
      setUserReviews([]);
      reviewsLoadedKeyRef.current = null;
      return;
    }
    if (reviewsLoadedKeyRef.current === reviewProductIdsKey) return;
    if (reviewsFetchFailedRef.current) return;

    let cancelled = false;
    reviewsInFlightRef.current = true;

    (async () => {
      console.info("[reviews] fetching", { productCount: reviewProductIdsKey.split(",").length });
      try {
        const res = await fetch(
          `/api/reviews?mine=true&product_ids=${encodeURIComponent(reviewProductIdsKey)}`,
          {
            cache: "no-store",
            credentials: "include"
          }
        );
        if (cancelled) return;
        if (!res.ok) {
          reviewsFetchFailedRef.current = true;
          console.error("[reviews] failed", { status: res.status });
          return;
        }
        const data = (await res.json()) as { reviews?: UserReviewPreview[] };
        const reviews = data.reviews ?? [];
        setUserReviews(reviews);
        reviewsLoadedKeyRef.current = reviewProductIdsKey;
        console.info("[reviews] success", { count: reviews.length });
      } catch (err) {
        if (!cancelled) {
          reviewsFetchFailedRef.current = true;
          console.error("[reviews] failed", err);
        }
      } finally {
        if (!cancelled) {
          reviewsInFlightRef.current = false;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, reviewProductIdsKey]);

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
        void fetchOrders({ background: true, force: true });
      }

      toast.success(data.message ?? "Your order has been cancelled.");
      setCancelTarget(null);
    } catch {
      toast.error("Unable to cancel order. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  };

  const visibleOrders = orders;

  useEffect(() => {
    if (hasSsrOrders) {
      console.info("[orders] rendered", { count: visibleOrders.length });
      return;
    }
    if (!authReady || isLoading) return;
    console.info("[orders] rendered", { count: visibleOrders.length });
  }, [authReady, hasSsrOrders, isLoading, visibleOrders.length]);

  if (!hasSsrOrders && (!authReady || isLoading) && visibleOrders.length === 0) {
    return <p className="mt-4 text-sm text-foreground/60">Loading your orders…</p>;
  }

  if (visibleOrders.length === 0) {
    return <p className="mt-4 text-sm text-foreground/60">You haven&apos;t placed any orders yet.</p>;
  }

  return (
    <>
      <div className="mx-auto mt-4 flex w-full max-w-[780px] flex-col gap-4">
        {visibleOrders.map((order) => {
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
          const paymentLabel = customerPaymentLabel(normalized);
          const methodLabel = paymentMethodLabel(normalized.payment_method);
          const shipping = getShippingAmount(order);
          const orderTotal = Number(order.total);
          const safeTotal = Number.isFinite(orderTotal) ? orderTotal : 0;

          return (
            <article key={order.id} className={ORDER_CARD_CLASS}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-[20px] font-bold leading-tight text-primary">
                    {order.order_number}
                  </p>
                  <p className="text-xs text-foreground/55">
                    {formatOrderDate(order.created_at)}
                    <span> · {formatOrderTime(order.created_at)}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <MetaBadge label={paymentLabel} variant="green" />
                    {methodLabel !== "—" ? (
                      <MetaBadge label={methodLabel} variant="blue" />
                    ) : null}
                  </div>
                  {showOrderStatusMessage ? (
                    <p className="pt-0.5 text-xs leading-snug text-foreground/55">
                      {CUSTOMER_ORDER_STATUS_MESSAGE}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-col items-end text-right">
                  <p className="text-[22px] font-bold leading-none tabular-nums text-primary">
                    {formatCurrency(safeTotal)}
                  </p>
                  <p className="mt-1 text-xs text-foreground/55">Total Amount</p>
                  <p className="text-xs text-foreground/55">Shipping ₹{shipping}</p>
                  <span
                    className={`mt-1.5 inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold ${getCustomerOrderStatusBadgeClass(normalized)}`}
                  >
                    {getCustomerFacingStatusLabel(normalized)}
                  </span>
                </div>
              </div>

              {deliveryEstimate ? (
                <p className="mt-2 text-xs text-foreground/55">
                  <span className="font-medium text-foreground/70">Estimated Delivery:</span>{" "}
                  {deliveryEstimate}
                </p>
              ) : null}

              {(() => {
                const shipment = getCustomerShipmentSummary(normalized, storeInfo);
                if (!shipment) return null;
                return (
                  <div className="mt-3 rounded-xl border border-[#F3D6DD] bg-[#FFF8FA] p-3.5 text-sm text-foreground/80">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
                      Shipment
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/50">
                          Courier
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-foreground">
                          {shipment.courier}
                        </p>
                      </div>
                      {shipment.trackingNumber ? (
                        <div className="text-right sm:text-left">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/50">
                            Tracking Number
                          </p>
                          <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                            {shipment.trackingNumber}
                          </p>
                        </div>
                      ) : (
                        <div />
                      )}
                    </div>

                    <div className="mt-3 border-t border-[#F3D6DD] pt-3">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/50">
                            From
                          </p>
                          <p className="mt-1 whitespace-pre-line text-sm font-medium leading-relaxed text-foreground">
                            {shipment.fromAddressLines.join("\n")}
                          </p>
                        </div>
                        {shipment.toAddressLines.length ? (
                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/50">
                              To
                            </p>
                            <p className="mt-1 whitespace-pre-line text-sm font-medium leading-relaxed text-foreground">
                              {shipment.toAddressLines.join("\n")}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <CustomerCancelledOrderSection order={normalized} />

              {items.length > 0 ? (
                <div className="mt-3 border-t border-[#F3D6DD] pt-3">
                  {items.map((item, index) => {
                    const productId = item.productId;

                    return (
                      <div
                        key={`${order.id}-${productId}-${item.size}-${index}`}
                        className={`flex items-center gap-3 ${index > 0 ? "mt-3 border-t border-[#F3D6DD] pt-3" : ""}`}
                      >
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-white">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="80px"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-[10px] text-foreground/35">
                              —
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-semibold leading-snug text-gray-900">
                            {item.name}
                          </p>
                          <p className="mt-0.5 text-sm leading-snug text-foreground/60">
                            Size: {item.size}
                          </p>
                          <p className="text-sm leading-snug text-foreground/60">
                            Color: {item.color}
                          </p>
                          <p className="text-sm leading-snug text-foreground/60">
                            Qty: {item.quantity}
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-gray-900">
                            Price: {formatOrderItemPriceValue(item, formatCurrency)}
                          </p>
                        </div>
                        {isDelivered && productId ? (
                          <OrderReviewButton
                            productId={productId}
                            productName={item.name}
                            orderId={order.id}
                            size={item.size}
                            color={item.color}
                            userReviews={userReviews}
                            onReviewChange={refreshReviews}
                            compact
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 border-t border-[#F3D6DD] pt-3 text-sm text-foreground/55">
                  No items recorded for this order.
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => downloadInvoicePdf(normalized, storeInfo.storeName)}
                  className={`${ORDER_ACTION_BUTTON_CLASS} border border-primary text-primary hover:bg-primary/5`}
                >
                  Download Invoice
                </button>
                {canCancel ? (
                  <button
                    type="button"
                    onClick={() => setCancelTarget(normalized)}
                    disabled={cancelLoading}
                    className={`${ORDER_ACTION_BUTTON_CLASS} border border-red-500 text-red-600 hover:bg-red-50 disabled:opacity-60`}
                  >
                    Cancel Order
                  </button>
                ) : null}
              </div>

              {isCancelled ? (
                <p className="mt-2 text-xs text-foreground/55">This order has been cancelled.</p>
              ) : isCancelPending ? (
                <p className="mt-2 text-xs text-foreground/55">
                  Cancellation request submitted — awaiting store review.
                </p>
              ) : null}
            </article>
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
