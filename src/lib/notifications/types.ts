export type InAppNotificationType =
  | "new_order"
  | "packing_assigned"
  | "packed"
  | "ready_for_shipping"
  | "shipped"
  | "reminder"
  | "back_in_stock";

export type NotificationChannel = "email" | "whatsapp" | "push";

export type OrderNotificationEvent =
  | "new_order"
  | "packing_assigned"
  | "packed"
  | "ready_for_shipping"
  | "shipped"
  | "worker_packed"
  | "ready_for_dispatch";

export type DbNotification = {
  id: string;
  order_id: string | null;
  type: InAppNotificationType;
  recipient: string;
  title: string;
  message: string;
  payload: Record<string, unknown> | null;
  status: string;
  is_read: boolean;
  created_at: string;
  remind_after?: string | null;
};

export type NotificationLogRow = {
  id: string;
  order_id: string | null;
  channel: NotificationChannel;
  event: string;
  success: boolean;
  error_message: string | null;
  created_at: string;
};

export function normalizeNotificationEvent(event: string): OrderNotificationEvent {
  if (event === "worker_packed") return "packed";
  if (event === "ready_for_dispatch") return "ready_for_shipping";
  return event as OrderNotificationEvent;
}

export function inAppTypeFromEvent(event: OrderNotificationEvent): InAppNotificationType {
  if (event === "worker_packed") return "packed";
  if (event === "ready_for_dispatch") return "ready_for_shipping";
  return event as InAppNotificationType;
}

export function notificationTypeLabel(type: string): string {
  switch (type) {
    case "new_order":
      return "New Order";
    case "packing_assigned":
      return "Packing Assigned";
    case "packed":
    case "worker_packed":
      return "Packed";
    case "ready_for_shipping":
    case "ready_for_dispatch":
      return "Ready For Shipping";
    case "shipped":
      return "Shipped";
    case "reminder":
      return "Pending Reminder";
    case "back_in_stock":
      return "Back In Stock Request";
    default:
      return type.replace(/_/g, " ");
  }
}
