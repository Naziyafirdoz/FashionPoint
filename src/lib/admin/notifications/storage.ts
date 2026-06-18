import type { AdminNotification } from "@/lib/admin/notifications/types";

const STORAGE_KEY = "fashionpoint_admin_notifications";
const MAX_NOTIFICATIONS = 50;

export function notificationDedupKey(orderId: string, type: string): string {
  return `${orderId}:${type}`;
}

export function loadNotifications(): AdminNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AdminNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveNotifications(notifications: AdminNotification[]): void {
  if (typeof window === "undefined") return;
  const trimmed = notifications.slice(0, MAX_NOTIFICATIONS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function hasNotification(id: string): boolean {
  return loadNotifications().some((n) => n.id === id);
}
