import type { AdminNotification } from "@/lib/admin/notifications/types";
import type { DbNotification } from "@/lib/notifications/types";

/** Client-safe mapper — no server dependencies. */
export function mapDbNotificationToAdmin(row: DbNotification): AdminNotification {
  return {
    id: row.id,
    type: row.type,
    orderId: row.order_id,
    orderNumber: String((row.payload as { order_number?: string })?.order_number ?? ""),
    title: row.title,
    message: row.message,
    read: row.is_read,
    createdAt: row.created_at,
    source: "database"
  };
}
