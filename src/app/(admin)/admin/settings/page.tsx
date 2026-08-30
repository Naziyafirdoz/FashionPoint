import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSettingsClient } from "@/components/admin/settings/AdminSettingsClient";
import {
  getIntegrationStatuses,
  getPaymentsSettingsStatus
} from "@/lib/settings/integration-status";
import { loadStoreInformationFromDb } from "@/lib/settings/store-information-store";

export default async function AdminSettingsPage() {
  const integrations = getIntegrationStatuses();
  const payments = getPaymentsSettingsStatus();
  const initialStoreInformation = await loadStoreInformationFromDb();

  return (
    <>
      <AdminHeader title="Settings" />
      <AdminSettingsClient
        integrations={integrations}
        payments={payments}
        initialStoreInformation={initialStoreInformation}
      />
    </>
  );
}
