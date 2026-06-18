"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { DeliveryInformationCard } from "@/components/admin/orders/detail/DeliveryInformationCard";
import { AdminDeliveryEstimate } from "@/components/admin/orders/detail/AdminDeliveryEstimate";
import { InternalNotesCard } from "@/components/admin/orders/detail/InternalNotesCard";
import { OrderDetailHeader } from "@/components/admin/orders/detail/OrderDetailHeader";
import { OrderDetailTimeline } from "@/components/admin/orders/detail/OrderDetailTimeline";
import { resolveDetailPrimaryAction } from "@/components/admin/orders/detail/resolveDetailAction";
import { ShippingCard } from "@/components/admin/orders/detail/ShippingCard";
import { MarkRefundedModal } from "@/components/admin/orders/MarkRefundedModal";
import { OrderProductsList } from "@/components/admin/orders/OrderProductsList";
import { RefundInformationSection } from "@/components/admin/orders/RefundInformationSection";
import { RefundTrackingUnavailable } from "@/components/admin/orders/RefundTrackingUnavailable";
import { ShippingModal } from "@/components/admin/orders/ShippingModal";
import { WorkerAssignCard } from "@/components/admin/orders/WorkerAssignCard";
import {
  customerEmail,
  customerName,
  customerPhone,
  downloadInvoicePdf,
  printOrder
} from "@/lib/orders/admin-orders";
import { applyPaymentRulesToOrder } from "@/lib/orders/payment-rules";
import {
  canMarkAsRefunded,
  refundAmountForOrder,
  shouldShowRefundSection
} from "@/lib/orders/refunds";
import { REFUND_MIGRATION_UNAVAILABLE } from "@/lib/orders/refund-schema";
import { isCancellationRefundWorkflowEnabled, RETURNS_EXCHANGES_REFUNDS_DISABLED } from "@/lib/store-policy";
import type { Order, ReturnRequest } from "@/types";

type OrderDetailClientProps = {
  orderId: string;
};

export function OrderDetailClient({ orderId }: OrderDetailClientProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showShipModal, setShowShipModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundTrackingAvailable, setRefundTrackingAvailable] = useState(true);
  const [returnRequest, setReturnRequest] = useState<ReturnRequest | null>(null);
  const [deliveryOtp, setDeliveryOtp] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const displayOrder = useMemo(
    () => (order ? applyPaymentRulesToOrder(order) : null),
    [order]
  );

  const loadOrder = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to load order");
        setOrder(null);
        return;
      }
      setOrder(data.order as Order);
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
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleShipConfirm = async (payload: {
    tracking_number: string;
    courier_partner: string;
    shipping_date: string;
  }) => {
    if (!order) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/ship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? data.details?.message ?? "Failed to ship order");
        return;
      }
      setOrder(data.order as Order);
      setShowShipModal(false);
      toast.success(data.message ?? "Order marked out for delivery");
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
      setOrder(data.order as Order);
      toast.success("Order moved to processing");
    } finally {
      setUpdating(false);
    }
  };

  const packOrder = async () => {
    if (!order) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/pack`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to pack order");
        return;
      }
      setOrder(data.order as Order);
      toast.success("Order packed — ready to ship");
    } finally {
      setUpdating(false);
    }
  };

  const verifyDeliveryOtp = async () => {
    if (!order || !deliveryOtp.trim()) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/verify-delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: deliveryOtp.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Invalid OTP");
        return;
      }
      setOrder(data.order as Order);
      toast.success("Delivery confirmed");
    } finally {
      setUpdating(false);
    }
  };

  const markDeliveredManual = async () => {
    if (!order) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "delivered" })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to mark delivered");
        return;
      }
      setOrder(data.order as Order);
      toast.success("Marked as delivered");
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
      setOrder(data.order as Order);
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
      setOrder(data.order as Order);
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
      setOrder(data.order as Order);
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
      setOrder(data.order as Order);
      toast.success(data.message ?? "Order approved");
    } finally {
      setUpdating(false);
    }
  };

  const markOutForDelivery = async () => {
    if (!order) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/out-for-delivery`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to update order");
        return;
      }
      setOrder(data.order as Order);
      toast.success(data.message ?? "Marked out for delivery");
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

  const runPrimaryAction = () => {
    if (!displayOrder || !primaryAction) return;
    switch (primaryAction.type) {
      case "approve_order":
        void approveOrder();
        break;
      case "start_processing":
        startProcessing();
        break;
      case "assign_worker":
        break;
      case "pack":
        packOrder();
        break;
      case "ship":
        setShowShipModal(true);
        break;
      case "mark_out_for_delivery":
        void markOutForDelivery();
        break;
      case "mark_delivered":
        markDeliveredManual();
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
                  primaryAction && primaryAction.type !== "view" ? primaryAction.label : undefined
                }
                onPrimaryAction={
                  primaryAction && primaryAction.type !== "view" ? runPrimaryAction : undefined
                }
                primaryActionDisabled={updating}
              />

              <div className="flex justify-end gap-2">
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

              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Customer Information
                  </h2>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div>
                      <dt className="text-gray-500">Name</dt>
                      <dd className="font-medium text-gray-900">{customerName(displayOrder)}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Email</dt>
                      <dd className="text-gray-900">{customerEmail(displayOrder)}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Phone</dt>
                      <dd className="text-gray-900">{customerPhone(displayOrder)}</dd>
                    </div>
                  </dl>
                </section>

                <div>
                  <DeliveryInformationCard shippingAddress={addr} />
                  <AdminDeliveryEstimate order={displayOrder} />
                </div>

                <OrderDetailTimeline
                  order={displayOrder}
                  returnRequest={RETURNS_EXCHANGES_REFUNDS_DISABLED ? null : returnRequest}
                  includeRefundEvents={
                    !RETURNS_EXCHANGES_REFUNDS_DISABLED && refundTrackingAvailable
                  }
                />

                <ShippingCard
                  order={displayOrder}
                  deliveryOtp={
                    displayOrder.delivery_otp &&
                    (displayOrder.status === "out_for_delivery" ||
                      (displayOrder.status as string) === "shipped")
                      ? displayOrder.delivery_otp
                      : undefined
                  }
                  showOtpInput={displayOrder.status === "out_for_delivery"}
                  otpValue={deliveryOtp}
                  onOtpChange={setDeliveryOtp}
                  onVerifyOtp={verifyDeliveryOtp}
                  verifying={updating}
                />

                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Financial Summary
                  </h2>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Subtotal</dt>
                      <dd className="tabular-nums">₹{Number(displayOrder.subtotal).toLocaleString("en-IN")}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Shipping</dt>
                      <dd className="tabular-nums">₹{Number(displayOrder.shipping_amount).toLocaleString("en-IN")}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Discount</dt>
                      <dd className="tabular-nums">₹{Number(displayOrder.discount_amount).toLocaleString("en-IN")}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Tax</dt>
                      <dd className="tabular-nums">₹{Number(displayOrder.tax_amount ?? 0).toLocaleString("en-IN")}</dd>
                    </div>
                    <div className="flex justify-between border-t border-gray-100 pt-2 font-semibold">
                      <dt>Total</dt>
                      <dd className="tabular-nums">₹{Number(displayOrder.total).toLocaleString("en-IN")}</dd>
                    </div>
                  </dl>
                </section>

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

                {(displayOrder.status as string) === "confirmed" ? (
                  <WorkerAssignCard
                    orderId={displayOrder.id}
                    disabled={updating}
                    onAssigned={() => void loadOrder()}
                  />
                ) : null}

                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
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
                  <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
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

      <ShippingModal
        open={showShipModal}
        orderNumber={order?.order_number ?? ""}
        initialTracking={order?.tracking_number ?? order?.tracking_id ?? ""}
        initialCourier={order?.courier_partner ?? order?.courier_name ?? ""}
        autoBooked={Boolean(order?.shipment_id || order?.tracking_number)}
        loading={updating}
        onConfirm={handleShipConfirm}
        onCancel={() => setShowShipModal(false)}
      />
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
