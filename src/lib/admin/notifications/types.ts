export type AdminNotificationPriority = "normal" | "high";

export type AdminNotificationType =
  | "new_order"
  | "packing_assigned"
  | "packed"
  | "ready_for_shipping"
  | "shipped"
  | "reminder"
  | "refund_pending"
  | "cancelled"
  | "customer_cancelled"
  | "refund_completed"
  | "worker_packed"
  | "ready_for_dispatch";

export type AdminNotification = {
  id: string;
  type: AdminNotificationType;
  orderId: string;
  orderNumber: string;
  title: string;
  message: string;
  amount?: number;
  priority?: AdminNotificationPriority;
  actionLabel?: string;
  payload?: Record<string, unknown>;
  status?: string;
  remindAfter?: string | null;
  read: boolean;
  createdAt: string;
  source?: "database" | "local";
};

export type OrderRealtimeEvent = {
  event: "INSERT" | "UPDATE";
  order: import("@/types").Order;
  previous?: import("@/types").Order | null;
};

export type OrderChangeListener = (payload: OrderRealtimeEvent) => void;
