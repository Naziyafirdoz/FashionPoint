"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminLiveStatus } from "@/components/admin/AdminLiveStatus";
import { AdminTablePagination } from "@/components/admin/AdminTablePagination";
import { StatsCard } from "@/components/admin/StatsCard";
import { MarkRefundedModal } from "@/components/admin/orders/MarkRefundedModal";
import { OrderFulfillmentGuide } from "@/components/admin/orders/OrderFulfillmentGuide";
import { showWorkflowSuccessToast } from "@/components/admin/orders/WorkflowSuccessToast";
import { OrderEmptyState } from "@/components/admin/orders/OrderEmptyState";
import { OrdersTable } from "@/components/admin/orders/OrdersTable";
import { useAdminNotifications } from "@/contexts/AdminNotificationsProvider";
import {
  orderMatchesOrdersView,
  toOrderListRow
} from "@/lib/admin/notifications/orders-view";
import { PAGE_SIZE, LEGACY_BRANCH_FILTER, LEGACY_BRANCH_LABEL, orderMatchesBranchFilter, type OrderListRow } from "@/lib/orders/admin-orders";
import { applyPaymentRulesToOrder } from "@/lib/orders/payment-rules";
import { triggerPostShipSideEffects } from "@/lib/orders/post-ship-side-effects";
import { refundAmountForOrder } from "@/lib/orders/refunds";
import {
  matchesOrderListFilter,
  resolveOrderListFilter,
  isCancelledOrdersView
} from "@/lib/orders/order-list-filter";
import type { AdminOrderStatsV2 } from "@/lib/orders/refund-queue";
import { applyOrderStatsDelta } from "@/lib/admin/notifications/stats-delta";
import { useLiveRefresh } from "@/lib/admin/use-live-refresh";
import { orderStatusLabel } from "@/lib/orders/status-config";
import type { Order } from "@/types";

type RefundTarget = OrderListRow | null;

type BranchOption = { id: string; name: string };

const EMPTY_STATS: AdminOrderStatsV2 = {
  total: 0,
  pending: 0,
  processing: 0,
  readyToShip: 0,
  shipped: 0,
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
  "confirmed",
  "ready_to_ship",
  "shipped",
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
  const [branchFilter, setBranchFilter] = useState("all");
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<RefundTarget>(null);

  const { subscribeToOrderChanges, seedKnownOrders, publishOrderSync } = useAdminNotifications();
  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  const activeFilter = useMemo(() => resolveOrderListFilter(statusFilter), [statusFilter]);

  const branchNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const branch of branches) {
      map.set(branch.id, branch.name);
    }
    return map;
  }, [branches]);

  useEffect(() => {
    setStatusFilter(urlTab);
  }, [urlTab]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/branches", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const rows = Array.isArray(data.branches) ? data.branches : [];
        const options: BranchOption[] = rows
          .map((row: { id?: unknown; name?: unknown }) => ({
            id: typeof row.id === "string" ? row.id : "",
            name: typeof row.name === "string" ? row.name : ""
          }))
          .filter((row: BranchOption) => row.id && row.name);
        if (!cancelled) setBranches(options);
      } catch {
        // Branch dropdown still works with All Branches + Legacy / Default.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/orders?stats_only=true&include_stats=true", {
        cache: "no-store"
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.stats) setStats(data.stats);
    } catch {
      // Stats load is non-blocking; cards update when available.
    }
  }, []);

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams();
      const apiTab =
        statusFilter === "refund_required" ? "cancelled_awaiting_refund" : statusFilter;
      params.set("tab", apiTab);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));
      params.set("include_review_counts", "true");
      if (paymentFilter !== "all") params.set("payment_method", paymentFilter);
      if (branchFilter !== "all") params.set("branch_id", branchFilter);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/orders?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      setOrders(data.orders ?? []);
      setTotalOrders(data.total ?? 0);
      if (Array.isArray(data.orders)) {
        seedKnownOrders(data.orders);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [statusFilter, paymentFilter, branchFilter, search, page, seedKnownOrders]);

  const refreshOrdersPage = useCallback(async () => {
    await Promise.all([loadOrders(true), loadStats()]);
  }, [loadOrders, loadStats]);

  const { lastUpdated, isLive, touch } = useLiveRefresh(refreshOrdersPage);

  useEffect(() => {
    const viewOptions = { statusFilter, paymentFilter, search };

    return subscribeToOrderChanges(({ event, order, previous }) => {
      touch();
      const current = ordersRef.current.find((o) => o.id === order.id);
      if (
        event === "UPDATE" &&
        current &&
        current.status === order.status &&
        current.updated_at === order.updated_at
      ) {
        return;
      }

      const prior =
        event === "UPDATE"
          ? (previous ?? ordersRef.current.find((o) => o.id === order.id) ?? null)
          : null;

      setStats((current) => applyOrderStatsDelta(current, order, prior));

      const listRow = toOrderListRow(order);
      const branchId = listRow.branch_id?.trim() ?? "";
      const row: OrderListRow = {
        ...listRow,
        branch_name:
          listRow.branch_name ?? (branchId ? branchNameById.get(branchId) ?? null : null)
      };
      const matches =
        orderMatchesOrdersView(order, viewOptions) &&
        orderMatchesBranchFilter(order, branchFilter);

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
  }, [subscribeToOrderChanges, statusFilter, paymentFilter, branchFilter, search, page, touch, branchNameById]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    const t = setTimeout(async () => {
      await loadOrders();
      touch();
    }, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadOrders, search, touch]);

  const normalizedOrders = useMemo(
    () => orders.map((o) => applyPaymentRulesToOrder(o)),
    [orders]
  );

  const filteredOrders = useMemo(
    () => normalizedOrders.filter((o) => matchesOrderListFilter(o, activeFilter)),
    [normalizedOrders, activeFilter]
  );

  const applyOrderUpdate = useCallback(
    (updated: Order) => {
      const row = applyPaymentRulesToOrder(updated) as OrderListRow;
      const prior = ordersRef.current.find((o) => o.id === updated.id) ?? null;
      setStats((current) => applyOrderStatsDelta(current, updated, prior));
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...row } : o)));
      publishOrderSync(updated, prior);
    },
    [publishOrderSync]
  );

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

  const runFulfillmentAction = async (
    order: OrderListRow,
    path: string,
    successMessage: string,
    toastKind?: "pack" | "ship" | "deliver"
  ) => {
    setUpdatingOrderId(order.id);
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
      applyOrderUpdate(data.order);
      if (path === "mark-shipped") {
        triggerPostShipSideEffects(order.id);
      }
      if (toastKind) {
        showWorkflowSuccessToast(toastKind, setFilter);
      } else {
        toast.success(data.message ?? successMessage);
      }
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const approveOrder = async (order: OrderListRow) => {
    setUpdatingOrderId(order.id);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/approve-order`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to approve order");
        return;
      }
      applyOrderUpdate(data.order);
      toast.success(data.message ?? "Order approved");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const startPacking = async (order: OrderListRow) => {
    setUpdatingOrderId(order.id);
    try {
      const res = await fetch(`/api/orders/${order.id}/start-packing`, {
        method: "POST",
        credentials: "include",
        cache: "no-store"
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to start packing");
        return;
      }
      if (data.order) {
        applyOrderUpdate(data.order);
      }
      toast.success(data.message ?? "Packing started");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const readyForShipping = (order: OrderListRow) =>
    void runFulfillmentAction(order, "ready-for-shipping", "Order marked ready for shipping", "pack");

  const markShipped = (order: OrderListRow) =>
    void runFulfillmentAction(order, "mark-shipped", "Parcel handed to courier", "ship");

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
    if (s === "ready_to_ship") return "Ready for Shipping";
    if (s === "cancelled_awaiting_refund") return "Cancelled - Awaiting Refund";
    if (s === "cancelled_refunded") return "Cancelled & Refunded";
    if (s === "shipped") return "Handed to Courier";
    return orderStatusLabel(s);
  };

  const showCancelledSubFilters = isCancelledOrdersView(statusFilter);

  return (
    <>
      <AdminHeader
        title="Orders"
        action={<AdminLiveStatus lastUpdated={lastUpdated} isLive={isLive} />}
      />
      <div className="min-w-0 space-y-5 overflow-x-hidden p-4 sm:p-6">
        <OrderFulfillmentGuide />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            label="Handed to Courier"
            value={String(stats.shipped)}
            active={statusFilter === "shipped"}
            onClick={() => setFilter("shipped")}
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
          <select
            aria-label="Filter by branch"
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
            <option value={LEGACY_BRANCH_FILTER}>{LEGACY_BRANCH_LABEL}</option>
          </select>
          <Link
            href="/admin/orders/analytics"
            className="inline-flex h-10 items-center text-sm font-medium text-primary hover:underline"
          >
            Analytics
          </Link>
        </div>

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
              onPrint={(order) => {
                void import("@/lib/orders/admin-order-invoice").then(({ printOrder }) => {
                  printOrder(order);
                });
              }}
              onDownloadInvoice={(order) => {
                void import("@/lib/orders/admin-order-invoice").then(({ downloadInvoicePdf }) => {
                  downloadInvoicePdf(order);
                });
              }}
              onStartProcessing={startProcessing}
              onApproveOrder={approveOrder}
              onStartPacking={startPacking}
              onReadyForShipping={readyForShipping}
              onMarkShipped={markShipped}
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
