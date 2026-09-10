"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { FulfillmentMethodChooser } from "@/components/admin/orders/FulfillmentMethodChooser";
import { OrderProductsList } from "@/components/admin/orders/OrderProductsList";
import { RefundInformationSection } from "@/components/admin/orders/RefundInformationSection";
import { RefundTrackingUnavailable } from "@/components/admin/orders/RefundTrackingUnavailable";
import {
  downloadInvoicePdf,
  printOrder
} from "@/lib/orders/admin-order-invoice";
import { isAssignedDeliveryBoyOutForDelivery } from "@/lib/orders/admin-order-ui";
import { applyPaymentRulesToOrder } from "@/lib/orders/payment-rules";
import {
  canMarkAsRefunded,
  refundAmountForOrder,
  shouldShowRefundSection
} from "@/lib/orders/refunds";
import { REFUND_MIGRATION_UNAVAILABLE } from "@/lib/orders/refund-schema";
import { triggerPostShipSideEffects } from "@/lib/orders/post-ship-side-effects";
import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import type { FulfillmentZone } from "@/lib/orders/fulfillment-zone";
import { formatShippingAddress } from "@/lib/orders/fulfillment-workflow";
import {
  formatStoreInformationFromAddressLines,
  type StoreInformationShipmentSource
} from "@/lib/orders/customer-shipment-display";
import {
  courierLabelForMethod,
  isFulfillmentMethod,
  methodLocked
} from "@/lib/orders/fulfillment-method";
import {
  formatPickupTimeDisplay,
  getRapidoDeliveryDetails,
  resolveOrderCourierName
} from "@/lib/orders/rapido-delivery-metadata";
import { isCancellationRefundWorkflowEnabled, RETURNS_EXCHANGES_REFUNDS_DISABLED } from "@/lib/store-policy";
import { useAdminNotifications } from "@/contexts/AdminNotificationsProvider";
import type { Order, ReturnRequest } from "@/types";

async function refetchOrderFromApi(orderId: string): Promise<Order | null> {
  const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store", credentials: "include" });
  const data = await res.json();
  if (!res.ok || !data.order) return null;
  return data.order as Order;
}

type OrderDetailClientProps = {
  orderId: string;
  storeName: string;
  /** Admin Settings → Store Information used as shipment FROM. */
  shippingOrigin: StoreInformationShipmentSource;
};

export function OrderDetailClient({
  orderId,
  storeName,
  shippingOrigin
}: OrderDetailClientProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundTrackingAvailable, setRefundTrackingAvailable] = useState(true);
  const [returnRequest, setReturnRequest] = useState<ReturnRequest | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showRapidoGuide, setShowRapidoGuide] = useState(false);
  const [assignedDeliveryStaffName, setAssignedDeliveryStaffName] = useState<string | null>(
    null
  );
  const { subscribeToOrderChanges, publishOrderSync, seedKnownOrders } = useAdminNotifications();

  const displayOrder = useMemo(
    () => (order ? applyPaymentRulesToOrder(order) : null),
    [order]
  );

  const applyFreshOrder = useCallback(
    (fresh: Order, previous?: Order | null) => {
      setOrder(fresh);
      seedKnownOrders([fresh]);
      publishOrderSync(fresh, previous ?? null);
    },
    [publishOrderSync, seedKnownOrders]
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
    } finally {
      setLoading(false);
    }
  }, [orderId, seedKnownOrders]);

  useEffect(() => {
    const workerId = displayOrder?.assigned_delivery_worker_id?.trim() ?? "";
    if (
      !displayOrder ||
      !isAssignedDeliveryBoyOutForDelivery(displayOrder) ||
      !workerId
    ) {
      setAssignedDeliveryStaffName(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/delivery-workers", {
          credentials: "include",
          cache: "no-store"
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;
        const workers = (data.workers as Array<{ user_id?: string; name?: string; display_name?: string }> | undefined) ?? [];
        const match = workers.find((w) => w.user_id === workerId);
        const name =
          (typeof match?.display_name === "string" && match.display_name.trim()) ||
          (typeof match?.name === "string" && match.name.trim()) ||
          null;
        if (!cancelled) setAssignedDeliveryStaffName(name);
      } catch {
        if (!cancelled) setAssignedDeliveryStaffName(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [displayOrder]);

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

  const suggestedRefundReference = useMemo(() => {
    if (!displayOrder) return "REF-2026-001";
    const suffix = displayOrder.order_number.replace(/\D/g, "").slice(-6).padStart(6, "0");
    return `REF-${new Date().getFullYear()}-${suffix}`;
  }, [displayOrder]);

  const primaryAction = displayOrder ? resolveDetailPrimaryAction(displayOrder) : null;
  const isReadyToShip =
    displayOrder != null && normalizeLegacyStatus(displayOrder.status) === "ready_to_ship";
  const isShippedCourier =
    displayOrder != null &&
    normalizeLegacyStatus(displayOrder.status) === "shipped" &&
    displayOrder.fulfillment_method !== "delivery_boy";
  const isOutForDelivery =
    displayOrder != null && normalizeLegacyStatus(displayOrder.status) === "out_for_delivery";
  const isAssignedDeliveryStaffOfd =
    displayOrder != null && isAssignedDeliveryBoyOutForDelivery(displayOrder);
  const isDelivered =
    displayOrder != null && normalizeLegacyStatus(displayOrder.status) === "delivered";
  const showShipmentFromTo = isShippedCourier || isOutForDelivery || isDelivered;
  const fromAddressDisplay = formatStoreInformationFromAddressLines(shippingOrigin);
  const fromDisplayText = fromAddressDisplay.length ? fromAddressDisplay.join("\n") : "—";
  const lockedCourierLabel = displayOrder
    ? isFulfillmentMethod(displayOrder.fulfillment_method)
      ? courierLabelForMethod(displayOrder.fulfillment_method)
      : resolveOrderCourierName(displayOrder)
    : "";
  const lockedFulfillmentMethodLabel =
    displayOrder != null &&
    methodLocked(displayOrder) &&
    isFulfillmentMethod(displayOrder.fulfillment_method)
      ? courierLabelForMethod(displayOrder.fulfillment_method)
      : null;
  const lockedTracking =
    displayOrder?.tracking_number?.trim() || displayOrder?.tracking_id?.trim() || "";
  const lockedRapidoDetails =
    displayOrder && displayOrder.fulfillment_method === "rapido"
      ? getRapidoDeliveryDetails(displayOrder)
      : null;

  const fulfillmentZone: FulfillmentZone =
    displayOrder?.fulfillment_zone === "local" ? "local" : "outstation";

  const runPrimaryAction = () => {
    if (!displayOrder || !primaryAction) return;
    switch (primaryAction.type) {
      case "start_processing":
        void startProcessing();
        break;
      case "start_packing":
      case "approve_order":
        // Approval is email-only; packing is not on the normal admin path.
        break;
      case "mark_packed":
        // Legacy in-flight packing orders only.
        void runFulfillmentAction("pack", "Order marked packed");
        break;
      case "ready_for_shipping":
        void runFulfillmentAction("ready-for-shipping", "Order marked ready for shipping");
        break;
      case "mark_shipped":
        // Handled by FulfillmentMethodChooser on ready_to_ship.
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

  const showPrimaryInHeader =
    !isReadyToShip &&
    primaryAction != null &&
    primaryAction.type !== "view" &&
    primaryAction.type !== "approve_order" &&
    primaryAction.type !== "start_packing" &&
    primaryAction.type !== "mark_shipped";

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
                  showPrimaryInHeader ? primaryAction?.label : undefined
                }
                onPrimaryAction={showPrimaryInHeader ? runPrimaryAction : undefined}
                primaryActionDisabled={updating}
              />

              {isShippedCourier ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-sm font-semibold text-emerald-900">Handed to Courier</p>
                  <p className="mt-1 text-sm text-emerald-800">
                    {storeName} responsibility is complete.{" "}
                    {displayOrder.fulfillment_method === "dtdc" ? "DTDC" : "Rapido"} handles
                    delivery from here.
                  </p>
                  {lockedFulfillmentMethodLabel ? (
                    <p className="mt-2 text-sm font-medium text-emerald-950">
                      Delivery Method: {lockedFulfillmentMethodLabel} · Locked
                    </p>
                  ) : null}
                </div>
              ) : null}

              {isOutForDelivery ? (
                <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
                  <p className="text-sm font-semibold text-sky-900">Out for Delivery</p>
                  {isAssignedDeliveryStaffOfd ? (
                    <>
                      <p className="mt-1 text-sm text-sky-800">
                        Assigned to:{" "}
                        <span className="font-medium text-sky-950">
                          {assignedDeliveryStaffName?.trim() || "Delivery Staff"}
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-sky-800">
                        Delivery staff will complete delivery using the customer OTP.
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-sky-800">
                      Assigned to delivery staff. They will mark the order delivered on arrival.
                    </p>
                  )}
                  {lockedFulfillmentMethodLabel ? (
                    <p className="mt-2 text-sm font-medium text-sky-950">
                      Delivery Method: {lockedFulfillmentMethodLabel} · Locked
                    </p>
                  ) : null}
                </div>
              ) : null}

              {isReadyToShip ? (
                <div className="space-y-3">
                  <FulfillmentMethodChooser
                    order={displayOrder}
                    zone={fulfillmentZone}
                    shippingOrigin={shippingOrigin}
                    disabled={updating}
                    onOpenRapidoGuide={
                      fulfillmentZone === "local" ? () => setShowRapidoGuide(true) : undefined
                    }
                    onUpdated={(fresh) => {
                      applyFreshOrder(fresh, order);
                      if (normalizeLegacyStatus(fresh.status) === "shipped") {
                        triggerPostShipSideEffects(fresh.id);
                      }
                    }}
                  />
                </div>
              ) : null}

              {showShipmentFromTo ? (
                <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Shipment details
                  </h2>
                  <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
                    {lockedFulfillmentMethodLabel ? (
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Delivery Method
                        </dt>
                        <dd className="mt-1 font-medium text-gray-900">
                          {lockedFulfillmentMethodLabel} · Locked
                        </dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Courier
                      </dt>
                      <dd className="mt-1 text-gray-900">{lockedCourierLabel || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Tracking Number
                      </dt>
                      <dd className="mt-1 font-mono text-gray-900">
                        {lockedTracking || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        From
                      </dt>
                      <dd className="mt-1 whitespace-pre-line text-gray-900">{fromDisplayText}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        To
                      </dt>
                      <dd className="mt-1 whitespace-pre-line text-gray-900">
                        {formatShippingAddress(displayOrder)}
                      </dd>
                    </div>
                    {lockedRapidoDetails ? (
                      <>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Rider Name
                          </dt>
                          <dd className="mt-1 text-gray-900">
                            {lockedRapidoDetails.rider_name?.trim() || "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Rider Phone
                          </dt>
                          <dd className="mt-1 text-gray-900">
                            {lockedRapidoDetails.rider_phone?.trim() || "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Vehicle Number
                          </dt>
                          <dd className="mt-1 text-gray-900">
                            {lockedRapidoDetails.vehicle_number?.trim() || "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Pickup Time
                          </dt>
                          <dd className="mt-1 text-gray-900">
                            {lockedRapidoDetails.pickup_time
                              ? formatPickupTimeDisplay(lockedRapidoDetails.pickup_time) || "—"
                              : "—"}
                          </dd>
                        </div>
                        {lockedRapidoDetails.notes?.trim() ? (
                          <div className="sm:col-span-2">
                            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Notes
                            </dt>
                            <dd className="mt-1 whitespace-pre-line text-gray-900">
                              {lockedRapidoDetails.notes.trim()}
                            </dd>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </dl>
                </section>
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
                          printOrder(displayOrder, storeName);
                          setMenuOpen(false);
                        }}
                      >
                        Print Invoice
                      </button>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => {
                          downloadInvoicePdf(displayOrder, storeName);
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
                      {isAssignedDeliveryStaffOfd ? (
                        <button
                          type="button"
                          disabled={updating}
                          className="block w-full px-3 py-2 text-left text-sm text-amber-900 hover:bg-amber-50 disabled:opacity-50"
                          onClick={() => {
                            setMenuOpen(false);
                            void runFulfillmentAction(
                              "mark-delivered",
                              "Order marked as delivered"
                            );
                          }}
                        >
                          Admin Override: Mark Delivered
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid h-auto items-start gap-4 lg:grid-cols-2">
                <CustomerInformationCard order={displayOrder} />

                <DeliveryInformationCard shippingAddress={addr} order={displayOrder} />

                <OrderTimelineFinancialCard order={displayOrder} storeName={storeName} />

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

      {displayOrder && isReadyToShip && fulfillmentZone === "local" ? (
        <RapidoGuideModal
          open={showRapidoGuide}
          onClose={() => setShowRapidoGuide(false)}
          orderId={displayOrder.id}
          order={displayOrder}
          storeName={storeName}
          onOrderUpdated={(updated) =>
            setOrder((prev) => ({
              ...updated,
              fulfillment_zone: updated.fulfillment_zone ?? prev?.fulfillment_zone
            }))
          }
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
