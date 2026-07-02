"use client";

import { useEffect } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminLiveStatus } from "@/components/admin/AdminLiveStatus";
import { AdminDashboardClient } from "@/components/admin/dashboard/AdminDashboardClient";
import { useAdminNotifications } from "@/contexts/AdminNotificationsProvider";
import { useLiveTimestamp } from "@/lib/admin/use-live-timestamp";
import { useAdminOrderQueuesContext } from "@/lib/admin/use-admin-order-queues";

export function AdminDashboardPageClient() {
  const orderQueues = useAdminOrderQueuesContext();
  const { subscribeToOrderChanges } = useAdminNotifications();
  const { lastUpdated, touch } = useLiveTimestamp();

  useEffect(() => {
    return subscribeToOrderChanges(() => {
      touch();
    });
  }, [subscribeToOrderChanges, touch]);

  useEffect(() => {
    if (!orderQueues.loading) {
      touch();
    }
  }, [
    orderQueues.loading,
    orderQueues.actionRequiredCount,
    orderQueues.pendingApprovalCount,
    orderQueues.packingRequiredCount,
    orderQueues.dispatchRequiredCount,
    orderQueues.cancellationRequestsCount,
    orderQueues.refundRequestsCount,
    touch
  ]);

  return (
    <>
      <AdminHeader
        title="Dashboard"
        action={<AdminLiveStatus lastUpdated={lastUpdated} live />}
      />
      <AdminDashboardClient orderQueues={orderQueues} onDataLoaded={touch} onOrderDataChange={touch} />
    </>
  );
}
