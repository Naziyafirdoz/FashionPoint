"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { NotificationCenter } from "@/components/admin/NotificationCenter";
import { AdminProfileMenu } from "@/components/admin/AdminProfileMenu";
import { useAdminOrderQueuesContext } from "@/lib/admin/use-admin-order-queues";

export function AdminHeader({ title, action }: { title: string; action?: ReactNode }) {
  const { pendingApprovalCount } = useAdminOrderQueuesContext();

  return (
    <header className="flex items-center justify-between border-b bg-white px-4 py-4 sm:px-6">
      <h1 className="font-display text-xl font-bold text-primary">{title}</h1>
      <div className="flex items-center gap-3 sm:gap-4">
        {action}
        <div className="hidden items-center gap-2 rounded-full border px-3 py-1.5 md:flex">
          <Search className="h-4 w-4 text-foreground/50" />
          <input placeholder="Search..." className="w-40 bg-transparent text-sm outline-none" />
        </div>
        <NotificationCenter pendingApprovalCount={pendingApprovalCount} />
        <AdminProfileMenu />
      </div>
    </header>
  );
}
