"use client";

import { AdminNotificationsProvider } from "@/contexts/AdminNotificationsProvider";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { PushPermissionBanner } from "@/components/admin/PushPermissionBanner";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminNotificationsProvider>
      <div className="flex min-h-screen overflow-x-hidden bg-blush/30">
        <AdminSidebar />
        <div className="min-w-0 flex-1 overflow-x-hidden">
          <PushPermissionBanner />
          {children}
        </div>
      </div>
    </AdminNotificationsProvider>
  );
}
