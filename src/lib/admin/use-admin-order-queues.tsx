"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAdminNotificationsOptional } from "@/contexts/AdminNotificationsProvider";
import { devLog } from "@/lib/dev-log";
import { customerName } from "@/lib/orders/admin-orders";
import type { AdminOrderStatsV2 } from "@/lib/orders/refund-queue";
import type { Order } from "@/types";

export type AdminOrderQueueRow = {
  id: string;
  orderNumber: string;
  customer: string;
  amount: number;
  paymentStatus: string;
  date: string;
  status: string;
};

export type AdminOrderQueues = {
  pendingApproval: AdminOrderQueueRow[];
  pendingApprovalCount: number;
  packingRequiredCount: number;
  dispatchRequiredCount: number;
  cancellationRequestsCount: number;
  refundRequestsCount: number;
  actionRequiredCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
};

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
  customerCancellationRefunds: 0,
  returnRequests: 0,
  returnsApproved: 0,
  overdueRefunds: 0
};

function toRow(order: Order): AdminOrderQueueRow {
  return {
    id: order.id,
    orderNumber: order.order_number,
    customer: customerName(order),
    amount: Number(order.total) || 0,
    paymentStatus: order.payment_status ?? "—",
    date: order.created_at,
    status: order.status
  };
}

async function fetchAdminStats(): Promise<AdminOrderStatsV2> {
  const res = await fetch("/api/orders?stats_only=true&include_stats=true", { cache: "no-store" });
  if (!res.ok) return EMPTY_STATS;
  const data = (await res.json()) as { stats?: AdminOrderStatsV2 };
  return data.stats ?? EMPTY_STATS;
}

async function fetchTabTotal(tab: string): Promise<number> {
  const res = await fetch(`/api/orders?tab=${encodeURIComponent(tab)}&page=1&limit=1`, {
    cache: "no-store"
  });
  if (!res.ok) return 0;
  const data = (await res.json()) as { total?: number };
  return typeof data.total === "number" ? data.total : 0;
}

async function fetchTabOrders(tab: string, limit: number): Promise<Order[]> {
  const res = await fetch(
    `/api/orders?tab=${encodeURIComponent(tab)}&page=1&limit=${limit}`,
    { cache: "no-store" }
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { orders?: Order[] };
  return data.orders ?? [];
}

const AdminOrderQueuesContext = createContext<AdminOrderQueues | null>(null);

export function AdminOrderQueuesProvider({ children }: { children: ReactNode }) {
  const queues = useAdminOrderQueues();
  return (
    <AdminOrderQueuesContext.Provider value={queues}>{children}</AdminOrderQueuesContext.Provider>
  );
}

export function useAdminOrderQueuesContext(): AdminOrderQueues {
  const queues = useContext(AdminOrderQueuesContext);
  if (!queues) {
    throw new Error("useAdminOrderQueuesContext must be used within AdminOrderQueuesProvider");
  }
  return queues;
}

function useAdminOrderQueues(): AdminOrderQueues {
  const ctx = useAdminNotificationsOptional();
  const [pendingApproval, setPendingApproval] = useState<AdminOrderQueueRow[]>([]);
  const [counts, setCounts] = useState({
    pendingApprovalCount: 0,
    packingRequiredCount: 0,
    dispatchRequiredCount: 0,
    cancellationRequestsCount: 0,
    refundRequestsCount: 0
  });
  const [loading, setLoading] = useState(true);
  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) {
      devLog("[queues] skip refresh, request already in flight");
      return;
    }

    inFlightRef.current = true;

    try {
      const stats = await fetchAdminStats();

      const [processingOrders, packingTotal, cancellationTotal] = await Promise.all([
        stats.processing > 0 ? fetchTabOrders("processing", 10) : Promise.resolve([]),
        fetchTabTotal("confirmed"),
        fetchTabTotal("cancel_requested")
      ]);

      const pendingApprovalCount = stats.processing;
      const packingRequiredCount = packingTotal;
      const dispatchRequiredCount = stats.readyToShip;
      const cancellationRequestsCount = cancellationTotal;
      const refundRequestsCount = stats.refundPending;

      setCounts({
        pendingApprovalCount,
        packingRequiredCount,
        dispatchRequiredCount,
        cancellationRequestsCount,
        refundRequestsCount
      });

      setPendingApproval(
        processingOrders
          .map(toRow)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      );
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!ctx) return;
    return ctx.subscribeToOrderChanges(() => {
      void refresh();
    });
  }, [ctx, refresh]);

  const actionRequiredCount = useMemo(() => {
    return (
      counts.pendingApprovalCount +
      counts.packingRequiredCount +
      counts.dispatchRequiredCount +
      counts.cancellationRequestsCount +
      counts.refundRequestsCount
    );
  }, [counts]);

  return {
    pendingApproval,
    ...counts,
    actionRequiredCount,
    loading,
    refresh
  };
}
