"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAdminNotificationsOptional } from "@/contexts/AdminNotificationsProvider";
import { devLog } from "@/lib/dev-log";
import { customerName } from "@/lib/orders/admin-orders";
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
  packingRequired: AdminOrderQueueRow[];
  dispatchRequired: AdminOrderQueueRow[];
  pendingApprovalCount: number;
  packingRequiredCount: number;
  dispatchRequiredCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
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

async function fetchOrdersForQueues(): Promise<Order[]> {
  const res = await fetch("/api/orders?tab=all&page=1&limit=20", { cache: "no-store" });
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
  const [queues, setQueues] = useState({
    pendingApproval: [] as AdminOrderQueueRow[],
    packingRequired: [] as AdminOrderQueueRow[],
    dispatchRequired: [] as AdminOrderQueueRow[]
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
      const allOrders = await fetchOrdersForQueues();
      const processingOrders = allOrders.filter((order) => order.status === "processing");
      const confirmedOrders = allOrders.filter((order) => order.status === "confirmed");
      const readyOrders = allOrders.filter((order) => order.status === "ready_to_ship");

      const pendingApproval = processingOrders
        .map(toRow)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const packingRequired = confirmedOrders
        .map(toRow)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const dispatchRequired = readyOrders
        .map(toRow)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setQueues({ pendingApproval, packingRequired, dispatchRequired });
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

  return {
    ...queues,
    pendingApprovalCount: queues.pendingApproval.length,
    packingRequiredCount: queues.packingRequired.length,
    dispatchRequiredCount: queues.dispatchRequired.length,
    loading,
    refresh
  };
}
