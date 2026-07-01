"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CustomerInformationCard } from "@/components/admin/orders/detail/CustomerInformationCard";
import { DeliveryInformationCard } from "@/components/admin/orders/detail/DeliveryInformationCard";
import { InternalNotesCard } from "@/components/admin/orders/detail/InternalNotesCard";
import { OrderDetailHeader } from "@/components/admin/orders/detail/OrderDetailHeader";
import { OrderTimelineFinancialCard } from "@/components/admin/orders/detail/OrderTimelineFinancialCard";
import { resolveDetailPrimaryAction } from "@/components/admin/orders/detail/resolveDetailAction";
import { MarkRefundedModal } from "@/components/admin/orders/MarkRefundedModal";
import { RapidoGuideModal } from "@/components/admin/orders/RapidoGuideModal";
import { OrderProductsList } from "@/components/admin/orders/OrderProductsList";
import { RefundInformationSection } from "@/components/admin/orders/RefundInformationSection";
import { RefundTrackingUnavailable } from "@/components/admin/orders/RefundTrackingUnavailable";
import {
  downloadInvoicePdf,
  printOrder
} from "@/lib/orders/admin-order-invoice";
import { applyPaymentRulesToOrder } from "@/lib/orders/payment-rules";
import {
  canMarkAsRefunded,
  refundAmountForOrder,
  shouldShowRefundSection
} from "@/lib/orders/refunds";
import { REFUND_MIGRATION_UNAVAILABLE } from "@/lib/orders/refund-schema";
import { triggerPostShipSideEffects } from "@/lib/orders/post-ship-side-effects";
import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import { isCancellationRefundWorkflowEnabled, RETURNS_EXCHANGES_REFUNDS_DISABLED } from "@/lib/store-policy";
import { useAdminNotifications } from "@/contexts/AdminNotificationsProvider";
import type { Order, ReturnRequest } from "@/types";

async function refetchOrderFromApi(orderId: string): Promise<Order | null> {
  const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store", credentials: "include" });
  const data = await res.json();
  if (!res.ok || !data.order) return null;
  return data.order as Order;
}

/** Persist packing via API, then refetch — never mutate status locally. */
async function persistAutoStartPacking(orderId: string, oldStatus: string): Promise<Order | null> {
  console.info("[start-packing] old status:", oldStatus);
  console.info("[start-packing] calling API");

  let apiOk = false;
  let apiError: string | undefined;
  let apiReturnedStatus: string | undefined;

  try {
    const res = await fetch(`/api/orders/${orderId}/start-packing`, {
      method: "POST",
      credentials: "include",
      cache: "no-store"
    });
    const data = await res.json();
    apiOk = res.ok;
    apiError = data.error;
    apiReturnedStatus = data.order?.status;

    console.info("[start-packing] API response:", {
      httpStatus: res.status,
      ok: res.ok,
      body: data
    });
    console.info("[start-packing] database returned status:", apiReturnedStatus ?? "(none)");
  } catch (err) {
    console.error("[start-packing] API request failed:", err);
    toast.error("Unable to start packing");
    const fallback = await refetchOrderFromApi(orderId);
    console.info("[start-packing] refetched status:", fallback?.status ?? "(none)");
    return fallback;
  }

  const freshOrder = await refetchOrderFromApi(orderId);
  if (!freshOrder) {
    console.error("[start-packing] refetch failed after update attempt");
    toast.error("Unable to verify packing status");
    return null;
  }

  console.info("[start-packing] refetched status:", freshOrder.status);

  if (!apiOk) {
    toast.error(apiError ?? "Unable to start packing");
    return freshOrder;
  }

  if (normalizeLegacyStatus(freshOrder.status) !== "packing_assigned") {
    console.warn("[start-packing] update did not persist — still:", freshOrder.status);
    toast.error("Packing status was not saved to the database");
    return freshOrder;
  }

  return freshOrder;
}

type OrderDetailClientProps = {
  orderId: string;
};

export function OrderDetailClient({ orderId }: OrderDetailClientProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundTrackingAvailable, setRefundTrackingAvailable] = useState(true);
  const [returnRequest, setReturnRequest] = useState<ReturnRequest | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showRapidoGuide, setShowRapidoGuide] = useState(false);
  const autoPackingInFlightRef = useRef(false);
  const { subscribeToOrderChanges, publishOrderSync, seedKnownOrders } = useAdminNotifications();

  const displayOrder = useMemo(
    () => (order ? applyPaymentRulesToOrder(order) : null),
    [order]
  );

  const applyFreshOrder = useCallback(
    (fresh: Order, previous?: Order | null) => {
      console.info("[start-packing] publishOrderSync", {
        orderId: fresh.id,
        from: previous?.status ?? null,
        to: fresh.status
      });
      setOrder(fresh);
      seedKnownOrders([fresh]);
      publishOrderSync(fresh, previous ?? null);
    },
    [publishOrderSync, seedKnownOrders]
  );

  const tryAutoStartPacking = useCallback(
    async (loaded: Order) => {
      console.info("[start-packing] effect entered");
      console.info("[start-packing] order id:", loaded.id);
      console.info("[start-packing] current status:", loaded.status);

      if (normalizeLegacyStatus(loaded.status) !== "confirmed") {
        console.info("[start-packing] skip — status is not confirmed");
        return;
      }

      if (autoPackingInFlightRef.current) {
        console.info("[start-packing] skip — already in flight");
        return;
      }

      autoPackingInFlightRef.current = true;
      const previous = loaded;
      setUpdating(true);

      try {
        const freshOrder = await persistAutoStartPacking(orderId, previous.status);
        if (!freshOrder) return;

        if (normalizeLegacyStatus(freshOrder.status) === "packing_assigned") {
          applyFreshOrder(freshOrder, previous);
        } else {
          setOrder(freshOrder);
        }
      } finally {
        autoPackingInFlightRef.current = false;
        setUpdating(false);
      }
    },
    [orderId, applyFreshOrder]
  );

  const loadOrder = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store", credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to load order");
        setOrder(null);
        return;
      }

      const loaded = data.order as Order;
      setOrder(loaded);
      seedKnownOrders([loaded]);
      setReviewCount(typeof data.review_count === "number" ? data.review_count : null);
      if (typeof data.refund_tracking_available === "boolean") {
        setRefundTrackingAvailable(data.refund_tracking_available);
      }
      if (!RETURNS_EXCHANGES_REFUNDS_DISABLED) {
        const rrRes = await fetch("/api/admin/return-requests");
        if (rrRes.ok) {
          const rrData = await rrRes.json();
          const match = (rrData.return_requests as ReturnRequest[] | undefined)?.find(
            (r) => r.order_id === orderId
          );
          setReturnRequest(match ?? null);
        }
      } else {
        setReturnRequest(null);
      }

      if (normalizeLegacyStatus(loaded.status) === "confirmed") {
        await tryAutoStartPacking(loaded);
      }
    } finally {
      setLoading(false);
    }
  }, [orderId, seedKnownOrders, tryAutoStartPacking]);

  const commitOrderUpdate = useCallback(
    (updated: Order) => {
      setOrder((prev) => {
        publishOrderSync(updated, prev);
        return updated;
      });
      seedKnownOrders([updated]);
    },
    [publishOrderSync, seedKnownOrders]
  );

  useEffect(() => {
    autoPackingInFlightRef.current = false;
    void loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    return subscribeToOrderChanges(({ event, order: next }) => {
      if (event !== "UPDATE" || next.id !== orderId) return;
      void refetchOrderFromApi(orderId).then((fresh) => {
        if (fresh) setOrder(fresh);
      });
    });
  }, [orderId, subscribeToOrderChanges]);

  const runFulfillmentAction = async (path: string, fallbackMessage: string) => {
    if (!order) return;
    const previous = order;
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/${path}`, {
        method: "POST",
        credentials: "include",
        cache: "no-store"
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Action failed");
        return;
      }
      const freshOrder = await refetchOrderFromApi(orderId);
      if (freshOrder) {
        applyFreshOrder(freshOrder, previous);
      }
      toast.success(data.message ?? fallbackMessage);

      if (path === "mark-shipped" && res.ok) {
        triggerPostShipSideEffects(order.id);
      }
    } finally {
      setUpdating(false);
    }
  };

  const startProcessing = async () => {
    if (!order) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/start-processing`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to start processing");
        return;
      }
      commitOrderUpdate(data.order as Order);
      toast.success("Order moved to processing");
    } finally {
      setUpdating(false);
    }
  };

  const markAsRefunded = async (payload: { refund_reference: string; refund_notes: string }) => {
    if (!order) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success === false) {
        toast.error(data.message ?? REFUND_MIGRATION_UNAVAILABLE);
        return;
      }
      if (!res.ok) {
        toast.error(data.message ?? data.error ?? "Failed to mark refund");
        return;
      }
      commitOrderUpdate(data.order as Order);
      setShowRefundModal(false);
      toast.success("Refund marked as completed");
    } catch {
      toast.error("Failed to mark refund");
    } finally {
      setUpdating(false);
    }
  };

  const approveCancellation = async () => {
    if (!order) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/cancellation/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to approve cancellation");
        return;
      }
      commitOrderUpdate(data.order as Order);
      toast.success("Cancellation approved");
    } finally {
      setUpdating(false);
    }
  };

  const rejectCancellation = async () => {
    if (!order) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/cancellation/reject`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to reject cancellation");
        return;
      }
      commitOrderUpdate(data.order as Order);
      toast.success("Cancellation rejected — order restored to processing");
    } finally {
      setUpdating(false);
    }
  };

  const approveOrder = async () => {
    if (!order) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/approve-order`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to approve order");
        return;
      }
      commitOrderUpdate(data.order as Order);
      toast.success(data.message ?? "Order approved");
    } finally {
      setUpdating(false);
    }
  };

  const suggestedRefundReference = useMemo(() => {
    if (!displayOrder) return "REF-2026-001";
    const suffix = displayOrder.order_number.replace(/\D/g, "").slice(-6).padStart(6, "0");
    return `REF-${new Date().getFullYear()}-${suffix}`;
  }, [displayOrder]);

  const primaryAction = displayOrder ? resolveDetailPrimaryAction(displayOrder) : null;
  const isReadyToShip =
    displayOrder != null && normalizeLegacyStatus(displayOrder.status) === "ready_to_ship";

  const runPrimaryAction = () => {
    if (!displayOrder || !primaryAction) return;
    switch (primaryAction.type) {
      case "approve_order":
        void approveOrder();
        break;
      case "start_processing":
        void startProcessing();
        break;
      case "ready_for_shipping":
        void runFulfillmentAction("ready-for-shipping", "Order marked ready for shipping");
        break;
      case "mark_shipped":
        void runFulfillmentAction("mark-shipped", "Order marked as shipped");
        break;
      case "mark_delivered":
        void runFulfillmentAction("mark-delivered", "Order marked as delivered");
        break;
      case "process_refund":
        setShowRefundModal(true);
        break;
      default:
        break;
    }
  };

  const addr = displayOrder?.shipping_address;
  const showRefundEligible =
    (isCancellationRefundWorkflowEnabled() || !RETURNS_EXCHANGES_REFUNDS_DISABLED) &&
    displayOrder != null &&
    shouldShowRefundSection(displayOrder);

  return (
    <>
      <AdminHeader title="Order Detail" />
      <div className="min-h-screen bg-gray-50/80">
        <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
          {loading ? (
            <p className="text-sm text-gray-500">Loading order…</p>
          ) : !order || !displayOrder ? (
            <p className="text-sm text-gray-500">Order not found.</p>
          ) : (
            <>
              <OrderDetailHeader
                order={displayOrder}
                primaryActionLabel={
                  !isReadyToShip && primaryAction && primaryAction.type !== "view"
                    ? primaryAction.label
                    : undefined
                }
                onPrimaryAction={
                  !isReadyToShip && primaryAction && primaryAction.type !== "view"
                    ? runPrimaryAction
                    : undefined
                }
                primaryActionDisabled={updating}
              />

              {isReadyToShip ? (
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRapidoGuide(true)}
                    className="rounded-xl border-2 border-gold bg-white px-4 py-2 text-sm font-semibold text-maroon shadow-sm hover:bg-gold/10"
                  >
                    🛵 How to Book Rapido Parcel
                  </button>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={runPrimaryAction}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
                  >
                    🚚 Mark Shipped
                  </button>
                </div>
              ) : null}

              <div className="flex justify-end">
                <div className="relative">
                  <button
                    type="button"
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setMenuOpen((v) => !v)}
                  >
                    More actions
                  </button>
                  {menuOpen ? (
                    <div className="absolute right-0 z-10 mt-1 min-w-[12rem] rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => {
                          printOrder(displayOrder);
                          setMenuOpen(false);
                        }}
                      >
                        Print Invoice
                      </button>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => {
                          downloadInvoicePdf(displayOrder);
                          setMenuOpen(false);
                        }}
                      >
                        Download Invoice PDF
                      </button>
                      {refundTrackingAvailable &&
                      (isCancellationRefundWorkflowEnabled() || !RETURNS_EXCHANGES_REFUNDS_DISABLED) &&
                      canMarkAsRefunded(displayOrder) ? (
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm text-orange-800 hover:bg-orange-50"
                          onClick={() => {
                            setShowRefundModal(true);
                            setMenuOpen(false);
                          }}
                        >
                          Process refund
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid h-auto items-start gap-4 lg:grid-cols-2">
                <CustomerInformationCard order={displayOrder} />

                <DeliveryInformationCard shippingAddress={addr} order={displayOrder} />

                <OrderTimelineFinancialCard order={displayOrder} />

                {showRefundEligible && !refundTrackingAvailable ? (
                  <RefundTrackingUnavailable />
                ) : null}

                {showRefundEligible && refundTrackingAvailable ? (
                  <div className="lg:col-span-2">
                    <RefundInformationSection
                      order={displayOrder}
                      onApproveCancellation={() => void approveCancellation()}
                      onRejectCancellation={() => void rejectCancellation()}
                      onMarkRefundCompleted={() => setShowRefundModal(true)}
                      onProcessRefund={
                        canMarkAsRefunded(displayOrder) ? () => setShowRefundModal(true) : undefined
                      }
                      processingAction={updating}
                    />
                  </div>
                ) : null}

                <section className="lg:col-span-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Products
                  </h2>
                  <div className="mt-3">
                    <OrderProductsList items={displayOrder.items} variant="admin" />
                  </div>
                </section>

                <InternalNotesCard
                  orderId={displayOrder.id}
                  initialNotes={displayOrder.internal_notes ?? ""}
                  onSaved={(notes) => setOrder((prev) => (prev ? { ...prev, internal_notes: notes } : prev))}
                />

                {reviewCount != null && reviewCount > 0 ? (
                  <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:col-span-2">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                      Reviews
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                      {reviewCount} review{reviewCount === 1 ? "" : "s"} linked to this order.
                    </p>
                  </section>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>

      {displayOrder && isReadyToShip ? (
        <RapidoGuideModal
          open={showRapidoGuide}
          onClose={() => setShowRapidoGuide(false)}
          orderId={displayOrder.id}
          order={displayOrder}
          onOrderUpdated={(updated) => setOrder(updated)}
        />
      ) : null}

      {isCancellationRefundWorkflowEnabled() || !RETURNS_EXCHANGES_REFUNDS_DISABLED ? (
        <MarkRefundedModal
          open={showRefundModal}
          orderNumber={order?.order_number ?? ""}
          refundAmount={displayOrder ? refundAmountForOrder(displayOrder) : 0}
          suggestedReference={suggestedRefundReference}
          loading={updating}
          onConfirm={markAsRefunded}
          onCancel={() => setShowRefundModal(false)}
        />
      ) : null}
    </>
  );
}
