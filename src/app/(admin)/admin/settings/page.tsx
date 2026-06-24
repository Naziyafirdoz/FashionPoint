import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSettingsClient } from "@/components/admin/settings/AdminSettingsClient";
import {
  getIntegrationStatuses,
  getPaymentsSettingsStatus
} from "@/lib/settings/integration-status";

export default function AdminSettingsPage() {
  const integrations = getIntegrationStatuses();
  const payments = getPaymentsSettingsStatus();

  return (
    <>
      <AdminHeader title="Settings" />
      <AdminSettingsClient integrations={integrations} payments={payments} />
    </>
  );
}
