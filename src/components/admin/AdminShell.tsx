"use client";

import { AdminNotificationsProvider } from "@/contexts/AdminNotificationsProvider";
import { AdminOrderQueuesProvider } from "@/lib/admin/use-admin-order-queues";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import FirebaseNotificationPermission from "@/components/admin/FirebaseNotificationPermission";
import { PushPermissionBanner } from "@/components/admin/PushPermissionBanner";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminNotificationsProvider>
      <AdminOrderQueuesProvider>
        <FirebaseNotificationPermission />
        <div className="flex min-h-screen overflow-x-hidden bg-blush/30">
          <AdminSidebar />
          <div className="min-w-0 flex-1 overflow-x-hidden">
            <PushPermissionBanner />
            {children}
          </div>
        </div>
      </AdminOrderQueuesProvider>
    </AdminNotificationsProvider>
  );
}
