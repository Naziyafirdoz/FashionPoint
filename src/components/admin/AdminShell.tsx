"use client";

import { AdminNotificationsProvider } from "@/contexts/AdminNotificationsProvider";
import { AdminSidebarProvider, useAdminSidebar } from "@/contexts/AdminSidebarContext";
import { AdminOrderQueuesProvider } from "@/lib/admin/use-admin-order-queues";
import { AdminMobileMenuButton, AdminSidebar } from "@/components/admin/AdminSidebar";
import FirebaseNotificationPermission from "@/components/admin/FirebaseNotificationPermission";
import { PushPermissionBanner } from "@/components/admin/PushPermissionBanner";

function AdminShellLayout({ children }: { children: React.ReactNode }) {
  const { mobileOpen, closeMobile } = useAdminSidebar();

  return (
    <>
      <FirebaseNotificationPermission />
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close admin menu"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={closeMobile}
        />
      ) : null}
      <AdminMobileMenuButton />
      <div className="flex min-h-screen overflow-x-hidden bg-blush/30">
        <AdminSidebar />
        <div className="min-w-0 flex-1 overflow-x-hidden">
          <PushPermissionBanner />
          {children}
        </div>
      </div>
    </>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminNotificationsProvider>
      <AdminOrderQueuesProvider>
        <AdminSidebarProvider>
          <AdminShellLayout>{children}</AdminShellLayout>
        </AdminSidebarProvider>
      </AdminOrderQueuesProvider>
    </AdminNotificationsProvider>
  );
}
