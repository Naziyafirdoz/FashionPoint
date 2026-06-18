"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/types";

function parseOrderRow(row: Record<string, unknown>): Order {
  return row as unknown as Order;
}

/**
 * Subscribe to Supabase Realtime updates for the signed-in customer's orders.
 * Filters server-side to user_id = current user.
 */
export function useCustomerOrdersRealtime(
  userId: string | undefined,
  setOrders: Dispatch<SetStateAction<Order[]>>
) {
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const filter = `user_id=eq.${userId}`;

    const mergeOrder = (order: Order, event: "INSERT" | "UPDATE") => {
      setOrders((prev) => {
        const idx = prev.findIndex((o) => o.id === order.id);

        if (event === "INSERT") {
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...prev[idx], ...order };
            return next;
          }
          return [order, ...prev];
        }

        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...prev[idx], ...order };
          return next;
        }

        return prev;
      });
    };

    const channel = supabase
      .channel(`customer-orders-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders", filter },
        (payload) => {
          if (payload.new) {
            mergeOrder(parseOrderRow(payload.new as Record<string, unknown>), "INSERT");
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter },
        (payload) => {
          if (payload.new) {
            mergeOrder(parseOrderRow(payload.new as Record<string, unknown>), "UPDATE");
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, setOrders]);
}
