"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminTablePagination } from "@/components/admin/AdminTablePagination";
import { StatsCard } from "@/components/admin/StatsCard";
import { MarkRefundedModal } from "@/components/admin/orders/MarkRefundedModal";
import { OrderFulfillmentGuide } from "@/components/admin/orders/OrderFulfillmentGuide";
import { showWorkflowSuccessToast } from "@/components/admin/orders/WorkflowSuccessToast";
import { OrderActionCenter, type NotificationPulseKey } from "@/components/admin/orders/OrderActionCenter";
import { OrderEmptyState } from "@/components/admin/orders/OrderEmptyState";
import { OrdersTable } from "@/components/admin/orders/OrdersTable";
import { ShippingModal } from "@/components/admin/orders/ShippingModal";
import { useAdminNotifications } from "@/contexts/AdminNotificationsProvider";
import {
  orderMatchesOrdersView,
  toOrderListRow
} from "@/lib/admin/notifications/orders-view";
import { computeNotificationSummary } from "@/lib/admin/order-action-center";
import {
  PAGE_SIZE,
  printOrder,
  downloadInvoicePdf,
  type OrderListRow
} from "@/lib/orders/admin-orders";
import { applyPaymentRulesToOrder } from "@/lib/orders/payment-rules";
import { refundAmountForOrder } from "@/lib/orders/refunds";
import {
  matchesOrderListFilter,
  resolveOrderListFilter,
  isCancelledOrdersView
} from "@/lib/orders/order-list-filter";
import type { AdminOrderStatsV2 } from "@/lib/orders/refund-queue";
import { applyOrderStatsDelta } from "@/lib/admin/notifications/stats-delta";
import { orderStatusLabel } from "@/lib/orders/status-config";
import type { Order } from "@/types";

type ShipTarget = { order: OrderListRow };

const EMPTY_STATS: AdminOrderStatsV2 = {
  total: 0,
  pending: 0,
  processing: 0,
  readyToShip: 0,
  outForDelivery: 0,
  delivered: 0,
  cancelled: 0,
  pendingCancellations: 0,
  refundPending: 0,
  refunded: 0,
  returnRequests: 0,
  returnsApproved: 0,
  overdueRefunds: 0,
  customerCancellationRefunds: 0
};

const STATUS_OPTIONS = [
  "all",
  "new_orders",
  "pending",
  "processing",
  "ready_to_ship",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "cancelled_awaiting_refund",
  "cancelled_refunded"
] as const;

const CANCELLED_SUB_FILTERS = [
  { id: "cancelled", label: "All Cancelled" },
  { id: "cancelled_awaiting_refund", label: "Awaiting Refund" },
  { id: "cancelled_refunded", label: "Cancelled & Refunded" }
] as const;

export function AdminOrdersClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab") ?? searchParams.get("status") ?? "all";

  const [orders, setOrders] = useState<OrderListRow[]>([]);
  const [stats, setStats] = useState<AdminOrderStatsV2>(EMPTY_STATS);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(urlTab);
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [shipTarget, setShipTarget] = useState<ShipTarget | null>(null);
  const [refundTarget, setRefundTarget] = useState<OrderListRow | null>(null);
  const [pulseKey, setPulseKey] = useState<NotificationPulseKey>(null);

  const { subscribeToOrderChanges, seedKnownOrders } = useAdminNotifications();
  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  const activeFilter = useMemo(() => resolveOrderListFilter(statusFilter), [statusFilter]);
  const notificationCounts = useMemo(() => computeNotificationSummary(stats), [stats]);
  const prevNotificationCountsRef = useRef(notificationCounts);

  useEffect(() => {
    const prev = prevNotificationCountsRef.current;
    let nextPulse: NotificationPulseKey = null;
    if (notificationCounts.newOrders > prev.newOrders) nextPulse = "newOrders";

    prevNotificationCountsRef.current = notificationCounts;

    if (!nextPulse) return;
    setPulseKey(nextPulse);
    const timer = window.setTimeout(() => setPulseKey(null), 700);
    return () => window.clearTimeout(timer);
  }, [notificationCounts]);

  useEffect(() => {
    setStatusFilter(urlTab);
  }, [urlTab]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const apiTab =
        statusFilter === "new_orders"
          ? "all"
          : statusFilter === "refund_required"
            ? "cancelled_awaiting_refund"
            : statusFilter;
      params.set("tab", apiTab);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));
      params.set("include_review_counts", "true");
      params.set("include_stats", "true");
      if (paymentFilter !== "all") params.set("payment_method", paymentFilter);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/orders?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      setOrders(data.orders ?? []);
      setTotalOrders(data.total ?? 0);
      if (data.stats) setStats(data.stats);
      if (Array.isArray(data.orders)) {
        seedKnownOrders(data.orders);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, paymentFilter, search, page, seedKnownOrders]);

  useEffect(() => {
    const viewOptions = { statusFilter, paymentFilter, search };

    return subscribeToOrderChanges(({ event, order, previous }) => {
      const prior =
        event === "UPDATE"
          ? (previous ?? ordersRef.current.find((o) => o.id === order.id) ?? null)
          : null;

      setStats((current) => applyOrderStatsDelta(current, order, prior));

      const row = toOrderListRow(order);
      const matches = orderMatchesOrdersView(order, viewOptions);

      if (event === "INSERT") {
        if (matches) {
          setTotalOrders((t) => t + 1);
          if (page === 1) {
            setOrders((prev) => {
              if (prev.some((o) => o.id === order.id)) return prev;
              return [row, ...prev].slice(0, PAGE_SIZE);
            });
          }
        }
        return;
      }

      setOrders((prev) => {
        const idx = prev.findIndex((o) => o.id === order.id);
        const wasInList = idx >= 0;

        if (wasInList && matches) {
          const next = [...prev];
          next[idx] = { ...prev[idx], ...row };
          return next;
        }
        if (wasInList && !matches) {
          setTotalOrders((t) => Math.max(0, t - 1));
          return prev.filter((o) => o.id !== order.id);
        }
        if (!wasInList && matches && page === 1) {
          setTotalOrders((t) => t + 1);
          if (prev.some((o) => o.id === order.id)) return prev;
          return [row, ...prev].slice(0, PAGE_SIZE);
        }
        return prev;
      });
    });
  }, [subscribeToOrderChanges, statusFilter, paymentFilter, search, page]);

  useEffect(() => {
    const t = setTimeout(loadOrders, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadOrders, search]);

  const normalizedOrders = useMemo(
    () => orders.map((o) => applyPaymentRulesToOrder(o)),
    [orders]
  );

  const filteredOrders = useMemo(
    () => normalizedOrders.filter((o) => matchesOrderListFilter(o, activeFilter)),
    [normalizedOrders, activeFilter]
  );

  const applyOrderUpdate = useCallback((updated: Order) => {
    const row = applyPaymentRulesToOrder(updated) as OrderListRow;
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...row } : o)));
  }, []);

  const setFilter = useCallback(
    (tab: string) => {
      setStatusFilter(tab);
      setPage(1);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      params.delete("status");
      router.replace(`/admin/orders?${params.toString()}`);
    },
    [router, searchParams]
  );

  const startProcessing = async (order: OrderListRow) => {
    setUpdatingOrderId(order.id);
    try {
      const res = await fetch(`/api/orders/${order.id}/start-processing`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to start processing");
        return;
      }
      applyOrderUpdate(data.order);
      toast.success("Order moved to processing");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const packOrder = async (order: OrderListRow) => {
    setUpdatingOrderId(order.id);
    try {
      const res = await fetch(`/api/orders/${order.id}/pack`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to pack order");
        return;
      }
      applyOrderUpdate(data.order);
      showWorkflowSuccessToast("pack", setFilter);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleShipConfirm = async (payload: {
    tracking_number: string;
    courier_partner: string;
    shipping_date: string;
  }) => {
    if (!shipTarget) return;
    setUpdatingOrderId(shipTarget.order.id);
    try {
      if (process.env.NODE_ENV === "development") {
        console.log("[ship-order] modal submit", {
          orderId: shipTarget.order.id,
          orderNumber: shipTarget.order.order_number,
          payload
        });
      }
      const res = await fetch(`/api/orders/${shipTarget.order.id}/ship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        if (process.env.NODE_ENV === "development") {
          console.error("[ship-order] API error", {
            orderId: shipTarget.order.id,
            status: res.status,
            response: data
          });
        }
        toast.error(data.error ?? data.details?.message ?? "Failed to ship order");
        return;
      }
      applyOrderUpdate(data.order);
      setShipTarget(null);
      showWorkflowSuccessToast("ship", setFilter);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const markDelivered = async (order: OrderListRow) => {
    setUpdatingOrderId(order.id);
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
      applyOrderUpdate(data.order);
      showWorkflowSuccessToast("deliver", setFilter);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const markAsRefunded = async (payload: { refund_reference: string; refund_notes?: string }) => {
    if (!refundTarget) return;
    setUpdatingOrderId(refundTarget.id);
    try {
      const res = await fetch(`/api/orders/${refundTarget.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? data.error ?? "Failed to process refund");
        return;
      }
      applyOrderUpdate(data.order);
      setRefundTarget(null);
      toast.success(`Refund completed for order ${refundTarget.order_number}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalOrders / PAGE_SIZE));

  const statusLabel = (s: string) => {
    if (s === "all") return "All statuses";
    if (s === "new_orders") return "New Orders";
    if (s === "cancelled_awaiting_refund") return "Cancelled - Awaiting Refund";
    if (s === "cancelled_refunded") return "Cancelled & Refunded";
    return orderStatusLabel(s);
  };

  const showCancelledSubFilters = isCancelledOrdersView(statusFilter);

  return (
    <>
      <AdminHeader title="Orders" />
      <div className="min-w-0 space-y-5 overflow-x-hidden p-4 sm:p-6">
        <OrderFulfillmentGuide />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatsCard
            label="New Orders"
            value={String(stats.pending + stats.processing)}
            active={statusFilter === "new_orders"}
            onClick={() => setFilter("new_orders")}
          />
          <StatsCard
            label="Ready To Ship"
            value={String(stats.readyToShip)}
            active={statusFilter === "ready_to_ship"}
            onClick={() => setFilter("ready_to_ship")}
          />
          <StatsCard
            label="Out For Delivery"
            value={String(stats.outForDelivery)}
            active={statusFilter === "out_for_delivery"}
            onClick={() => setFilter("out_for_delivery")}
          />
          <StatsCard
            label="Delivered"
            value={String(stats.delivered)}
            active={statusFilter === "delivered"}
            onClick={() => setFilter("delivered")}
          />
          <StatsCard
            label="Cancelled Orders"
            value={String(stats.cancelled)}
            sub={
              stats.customerCancellationRefunds > 0
                ? `${stats.customerCancellationRefunds} awaiting refund`
                : undefined
            }
            active={showCancelledSubFilters}
            emphasis={stats.customerCancellationRefunds > 0 ? "warning" : undefined}
            onClick={() => setFilter("cancelled")}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="search"
              placeholder="Search order ID, name, email, or phone…"
              className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            aria-label="Filter by status"
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={statusFilter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by payment"
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All payments</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="cod">COD</option>
            <option value="netbanking">Net Banking</option>
            <option value="wallet">Wallet</option>
          </select>
          <Link
            href="/admin/orders/analytics"
            className="inline-flex h-10 items-center text-sm font-medium text-primary hover:underline"
          >
            Analytics
          </Link>
        </div>

        <OrderActionCenter
          counts={notificationCounts}
          pulseKey={pulseKey}
          onNewOrdersClick={() => setFilter("new_orders")}
          onReadyForShippingClick={() => setFilter("ready_to_ship")}
        />

        {showCancelledSubFilters ? (
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Cancelled order filters"
          >
            {CANCELLED_SUB_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === item.id ||
                  (item.id === "cancelled_awaiting_refund" && statusFilter === "refund_required")
                    ? "border-primary bg-primary text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                {item.label}
                {item.id === "cancelled_awaiting_refund" && stats.customerCancellationRefunds > 0
                  ? ` (${stats.customerCancellationRefunds})`
                  : ""}
              </button>
            ))}
          </div>
        ) : null}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <p className="p-8 text-center text-sm text-gray-500">Loading orders…</p>
          ) : filteredOrders.length === 0 ? (
            <OrderEmptyState filter={statusFilter} onNavigate={setFilter} />
          ) : (
            <OrdersTable
              orders={filteredOrders}
              updatingOrderId={updatingOrderId}
              onPrint={printOrder}
              onDownloadInvoice={downloadInvoicePdf}
              onStartProcessing={startProcessing}
              onPack={packOrder}
              onShip={(order) => setShipTarget({ order })}
              onMarkDelivered={markDelivered}
              onProcessRefund={(orderId) => {
                const order = filteredOrders.find((row) => row.id === orderId);
                if (order) setRefundTarget(order);
              }}
            />
          )}
        </div>

        <AdminTablePagination
          page={page}
          totalPages={totalPages}
          totalItems={totalOrders}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>

      <ShippingModal
        open={shipTarget != null}
        orderNumber={shipTarget?.order.order_number ?? ""}
        initialTracking={shipTarget?.order.tracking_number ?? shipTarget?.order.tracking_id ?? ""}
        initialCourier={shipTarget?.order.courier_partner ?? shipTarget?.order.courier_name ?? ""}
        autoBooked={Boolean(shipTarget?.order.shipment_id || shipTarget?.order.tracking_number)}
        loading={updatingOrderId != null}
        onConfirm={handleShipConfirm}
        onCancel={() => setShipTarget(null)}
      />

      <MarkRefundedModal
        open={refundTarget != null}
        orderNumber={refundTarget?.order_number ?? ""}
        refundAmount={refundTarget ? refundAmountForOrder(refundTarget) : 0}
        suggestedReference={refundTarget?.order_number ?? ""}
        loading={Boolean(refundTarget && updatingOrderId === refundTarget.id)}
        onConfirm={markAsRefunded}
        onCancel={() => setRefundTarget(null)}
      />
    </>
  );
}
