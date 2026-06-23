"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { NewOrderNotificationCard } from "@/components/admin/orders/NewOrderNotificationCard";
import { DeliveryFollowUpNotificationCard } from "@/components/admin/orders/DeliveryFollowUpNotificationCard";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { useAdminNotificationsOptional } from "@/contexts/AdminNotificationsProvider";
import type { AdminNotification } from "@/lib/admin/notifications/types";
import { isCancellationRefundWorkflowEnabled } from "@/lib/store-policy";

function notificationIcon(type: AdminNotification["type"]): string {
  if (type === "new_order") return "🛍️";
  if (
    type === "packed" ||
    type === "worker_packed" ||
    type === "packing_assigned" ||
    type === "ready_for_shipping" ||
    type === "ready_for_dispatch"
  ) {
    return "📦";
  }
  if (type === "shipped") return "🚚";
  if (type === "reminder") return "🔔";
  if (type === "refund_pending" || type === "refund_completed") return "💰";
  if (type === "customer_cancelled" || type === "cancelled") return "🚨";
  return "🔔";
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function isVisibleAdminNotification(notification: AdminNotification): boolean {
  if (notification.status === "cancelled") {
    return false;
  }

  if (
    notification.type === "reminder" &&
    notification.payload?.event === "delivery_follow_up" &&
    notification.remindAfter &&
    new Date(notification.remindAfter) > new Date()
  ) {
    return false;
  }

  if (
    notification.type === "new_order" ||
    notification.type === "packing_assigned" ||
    notification.type === "packed" ||
    notification.type === "worker_packed" ||
    notification.type === "ready_for_shipping" ||
    notification.type === "ready_for_dispatch" ||
    notification.type === "shipped" ||
    notification.type === "reminder"
  ) {
    return true;
  }
  return isCancellationRefundWorkflowEnabled();
}

function notificationActionLabel(notification: AdminNotification): string {
  return notification.actionLabel ?? "View order";
}

function isDeliveryFollowUpNotification(notification: AdminNotification): boolean {
  return (
    notification.type === "reminder" &&
    notification.payload?.event === "delivery_follow_up" &&
    notification.title.includes("Delivery Follow-up")
  );
}

function hasHighPriorityUnread(notifications: AdminNotification[]): boolean {
  return notifications.some((n) => !n.read && n.priority === "high");
}

export function NotificationCenter({ pendingApprovalCount = 0 }: { pendingApprovalCount?: number }) {
  const ctx = useAdminNotificationsOptional();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!ctx) {
    return (
      <button type="button" className="relative rounded-full p-2 hover:bg-blush" aria-label="Notifications">
        <Bell className="h-5 w-5" />
      </button>
    );
  }

  const { notifications, markAsRead, markAllAsRead, clearAll } = ctx;

  const visibleNotifications = notifications.filter(isVisibleAdminNotification);
  const visibleUnreadCount = visibleNotifications.filter((n) => !n.read).length;
  const badgeCount = Math.max(visibleUnreadCount, pendingApprovalCount);
  const showHighPriorityBadge = hasHighPriorityUnread(visibleNotifications) || pendingApprovalCount > 0;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`relative rounded-full p-2 hover:bg-blush ${
          showHighPriorityBadge ? "ring-2 ring-red-500/40" : ""
        }`}
      >
        <Bell className={`h-5 w-5 ${showHighPriorityBadge ? "text-red-700" : ""}`} />
        {badgeCount > 0 ? (
          <span
            className={`absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
              showHighPriorityBadge ? "animate-pulse bg-red-600" : "bg-accent"
            }`}
          >
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl sm:w-[26rem]">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
            <div className="flex items-center gap-1">
              {visibleUnreadCount > 0 ? (
                <button
                  type="button"
                  title="Mark all as read"
                  onClick={markAllAsRead}
                  className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              ) : null}
              {visibleNotifications.length > 0 ? (
                <button
                  type="button"
                  title="Clear all"
                  onClick={clearAll}
                  className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {visibleNotifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">No notifications yet</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {visibleNotifications.map((n) => {
                  const isHighPriority = n.priority === "high";
                  const isUnread = !n.read;

                  return (
                    <li key={n.id}>
                      <div
                        className={`px-4 py-3 transition ${
                          isUnread
                            ? isHighPriority
                              ? "border-l-4 border-l-red-600 bg-red-50"
                              : "bg-primary/5"
                            : "bg-white"
                        }`}
                      >
                        <div className="flex gap-3">
                          <span className="text-lg" aria-hidden>
                            {notificationIcon(n.type)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={`text-sm font-semibold ${
                                  isHighPriority ? "text-red-900" : "text-gray-900"
                                }`}
                              >
                                {n.title}
                              </p>
                              {isHighPriority && isUnread ? (
                                <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                  Urgent
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 space-y-1 text-xs leading-relaxed text-gray-600">
                              {n.type === "new_order" ? (
                                <NewOrderNotificationCard
                                  orderId={n.orderId}
                                  fallbackMessage={n.message}
                                  onActionComplete={() => markAsRead(n.id)}
                                />
                              ) : isDeliveryFollowUpNotification(n) ? (
                                <DeliveryFollowUpNotificationCard
                                  orderId={n.orderId}
                                  orderNumber={n.orderNumber}
                                  notificationId={n.id}
                                  fallbackMessage={n.message}
                                  onActionComplete={() => markAsRead(n.id)}
                                />
                              ) : (
                                n.message.split("\n").map((line, index) =>
                                  line.trim() ? (
                                    <p key={`${n.id}-line-${index}`}>{line}</p>
                                  ) : null
                                )
                              )}
                            </div>
                            <p className="mt-2 text-[11px] text-gray-400">{formatTime(n.createdAt)}</p>
                            {n.type !== "new_order" && !isDeliveryFollowUpNotification(n) ? (
                              <Link
                                href={`/admin/orders/${n.orderId}`}
                                className="mt-2 inline-flex rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90"
                                onClick={() => {
                                  markAsRead(n.id);
                                  setOpen(false);
                                }}
                              >
                                {notificationActionLabel(n)}
                              </Link>
                            ) : n.type === "new_order" ? (
                              <Link
                                href={`/admin/orders/${n.orderId}`}
                                className="mt-2 inline-flex text-xs font-medium text-primary hover:underline"
                                onClick={() => {
                                  markAsRead(n.id);
                                  setOpen(false);
                                }}
                              >
                                View order details
                              </Link>
                            ) : null}
                          </div>
                          {isUnread ? (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-600" aria-hidden />
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
