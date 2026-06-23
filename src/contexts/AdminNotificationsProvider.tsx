"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import {
  buildNotification,
  detectNotificationEvents,
  parseOrderRow,
  shouldEmitNotification
} from "@/lib/admin/notifications/order-events";
import { loadNotifications, saveNotifications } from "@/lib/admin/notifications/storage";
import type {
  AdminNotification,
  OrderChangeListener,
  OrderRealtimeEvent
} from "@/lib/admin/notifications/types";
import { mapDbNotificationToAdmin } from "@/lib/notifications/map-db-notification";
import type { DbNotification } from "@/lib/notifications/types";
import { createClient } from "@/lib/supabase/client";
import { broadcastOrderSync, subscribeOrderSyncBus } from "@/lib/orders/order-sync-bus";
import type { Order } from "@/types";

type AdminNotificationsContextValue = {
  notifications: AdminNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  subscribeToOrderChanges: (listener: OrderChangeListener) => () => void;
  seedKnownOrders: (orders: Order[]) => void;
  publishOrderSync: (order: Order, previous?: Order | null) => void;
};

const AdminNotificationsContext = createContext<AdminNotificationsContextValue | null>(null);

function mergeNotifications(
  db: AdminNotification[],
  local: AdminNotification[]
): AdminNotification[] {
  const byId = new Map<string, AdminNotification>();
  for (const n of db) byId.set(n.id, n);
  for (const n of local) {
    if (!byId.has(n.id)) byId.set(n.id, n);
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function AdminNotificationsProvider({ children }: { children: ReactNode }) {
  const [dbNotifications, setDbNotifications] = useState<AdminNotification[]>([]);
  const [localNotifications, setLocalNotifications] = useState<AdminNotification[]>([]);
  const listenersRef = useRef(new Set<OrderChangeListener>());
  const knownOrdersRef = useRef(new Map<string, Order>());

  useEffect(() => {
    setLocalNotifications(loadNotifications());
  }, []);

  const loadDbNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications");
      if (!res.ok) return;
      const data = (await res.json()) as { notifications?: AdminNotification[] };
      setDbNotifications(data.notifications ?? []);
    } catch {
      // ignore fetch errors
    }
  }, []);

  useEffect(() => {
    void loadDbNotifications();
  }, [loadDbNotifications]);

  const persistLocal = useCallback((next: AdminNotification[]) => {
    setLocalNotifications(next);
    saveNotifications(next);
  }, []);

  const emitOrderChange = useCallback((payload: OrderRealtimeEvent) => {
    for (const listener of listenersRef.current) {
      listener(payload);
    }
  }, []);

  const handleOrderEvent = useCallback(
    (event: "INSERT" | "UPDATE", row: Record<string, unknown>) => {
      const order = parseOrderRow(row);
      const previous =
        event === "UPDATE" ? (knownOrdersRef.current.get(order.id) ?? null) : null;
      knownOrdersRef.current.set(order.id, order);

      emitOrderChange({ event, order, previous });

      const types = detectNotificationEvents(event, order, previous);
      if (types.length === 0) return;

      setLocalNotifications((current) => {
        let next = [...current];
        let changed = false;

        for (const type of types) {
          if (!shouldEmitNotification(type, order)) continue;

          const notification = { ...buildNotification(type, order), source: "local" as const };
          next = [notification, ...next.filter((n) => n.id !== notification.id)];
          changed = true;
        }

        if (changed) {
          saveNotifications(next);
          return next;
        }
        return current;
      });
    },
    [emitOrderChange]
  );

  const publishOrderSync = useCallback(
    (order: Order, previous?: Order | null) => {
      const prior = previous ?? knownOrdersRef.current.get(order.id) ?? null;
      knownOrdersRef.current.set(order.id, order);
      emitOrderChange({ event: "UPDATE", order, previous: prior });
      broadcastOrderSync({ event: "UPDATE", order, previous: prior });
    },
    [emitOrderChange]
  );

  useEffect(() => {
    return subscribeOrderSyncBus(({ event, order, previous }) => {
      const prior = previous ?? knownOrdersRef.current.get(order.id) ?? null;
      knownOrdersRef.current.set(order.id, order);
      emitOrderChange({ event, order, previous: prior });
    });
  }, [emitOrderChange]);

  useEffect(() => {
    const supabase = createClient();

    const ordersChannel = supabase
      .channel("admin-orders-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          if (payload.new) handleOrderEvent("INSERT", payload.new as Record<string, unknown>);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          if (payload.new) handleOrderEvent("UPDATE", payload.new as Record<string, unknown>);
        }
      )
      .subscribe();

    const notificationsChannel = supabase
      .channel("admin-notifications-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: "recipient=eq.admin" },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            const mapped = mapDbNotificationToAdmin(payload.new as DbNotification);
            setDbNotifications((current) => [
              mapped,
              ...current.filter((n) => n.id !== mapped.id)
            ]);
          } else if (payload.eventType === "UPDATE" && payload.new) {
            const mapped = mapDbNotificationToAdmin(payload.new as DbNotification);
            setDbNotifications((current) =>
              current.map((n) => (n.id === mapped.id ? mapped : n))
            );
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ordersChannel);
      void supabase.removeChannel(notificationsChannel);
    };
  }, [handleOrderEvent]);

  const notifications = useMemo(
    () => mergeNotifications(dbNotifications, localNotifications),
    [dbNotifications, localNotifications]
  );

  const markAsRead = useCallback(
    (id: string) => {
      const item = notifications.find((n) => n.id === id);
      if (item?.source === "local" || !item?.source) {
        const next = localNotifications.map((n) => (n.id === id ? { ...n, read: true } : n));
        if (localNotifications.some((n) => n.id === id)) persistLocal(next);
      } else {
        setDbNotifications((current) =>
          current.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        void fetch("/api/admin/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id })
        });
      }
    },
    [notifications, localNotifications, persistLocal]
  );

  const markAllAsRead = useCallback(() => {
    persistLocal(localNotifications.map((n) => ({ ...n, read: true })));
    setDbNotifications((current) => current.map((n) => ({ ...n, read: true })));
    void fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mark_all_read: true })
    });
  }, [localNotifications, persistLocal]);

  const clearAll = useCallback(() => {
    persistLocal([]);
  }, [persistLocal]);

  const subscribeToOrderChanges = useCallback((listener: OrderChangeListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const seedKnownOrders = useCallback((orders: Order[]) => {
    for (const order of orders) {
      knownOrdersRef.current.set(order.id, order);
    }
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      clearAll,
      subscribeToOrderChanges,
      seedKnownOrders,
      publishOrderSync
    }),
    [
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      clearAll,
      subscribeToOrderChanges,
      seedKnownOrders,
      publishOrderSync
    ]
  );

  return (
    <AdminNotificationsContext.Provider value={value}>{children}</AdminNotificationsContext.Provider>
  );
}

export function useAdminNotifications() {
  const ctx = useContext(AdminNotificationsContext);
  if (!ctx) {
    throw new Error("useAdminNotifications must be used within AdminNotificationsProvider");
  }
  return ctx;
}

export function useAdminNotificationsOptional() {
  return useContext(AdminNotificationsContext);
}
