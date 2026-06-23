"use client";

import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { createClient } from "@/lib/supabase/client";
import { mergeCustomerOrderInList } from "@/lib/orders/merge-customer-order-list";
import { parseRealtimeOrderRow } from "@/lib/orders/parse-realtime-order";
import { subscribeOrderSyncBus } from "@/lib/orders/order-sync-bus";
import type { Order } from "@/types";

type UseCustomerOrdersRealtimeOptions = {
  /** Always refetch from API when a sync signal arrives (DB source of truth). */
  onSyncSignal?: () => void;
};

/**
 * Subscribe to Supabase Realtime updates for the signed-in customer's orders.
 * Stale events (older updated_at) are ignored for local merge; API refetch still runs.
 */
export function useCustomerOrdersRealtime(
  userId: string | undefined,
  setOrders: Dispatch<SetStateAction<Order[]>>,
  options?: UseCustomerOrdersRealtimeOptions
) {
  const onSyncSignalRef = useRef(options?.onSyncSignal);
  onSyncSignalRef.current = options?.onSyncSignal;

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const filter = `user_id=eq.${userId}`;

    const handleOrderEvent = (order: Order, event: "INSERT" | "UPDATE") => {
      console.log("[Realtime]", order.id, order.status, order.updated_at, { event });
      setOrders((prev) => mergeCustomerOrderInList(prev, order, event));
      // TEMP: scheduleRefetch disabled while debugging pool flooding.
      // onSyncSignalRef.current?.();
    };

    const channel = supabase
      .channel(`customer-orders-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders", filter },
        (payload) => {
          if (payload.new) {
            handleOrderEvent(parseRealtimeOrderRow(payload.new as Record<string, unknown>), "INSERT");
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter },
        (payload) => {
          if (payload.new) {
            handleOrderEvent(parseRealtimeOrderRow(payload.new as Record<string, unknown>), "UPDATE");
          }
        }
      )
      .subscribe();

    const unsubscribeBus = subscribeOrderSyncBus(({ event, order }) => {
      if (order.user_id !== userId) return;
      handleOrderEvent(order, event);
    });

    return () => {
      unsubscribeBus();
      void supabase.removeChannel(channel);
    };
  }, [userId, setOrders]);
}
