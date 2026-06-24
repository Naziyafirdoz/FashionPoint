import { CreditCard } from "lucide-react";
import type { PaymentsSettingsStatus } from "@/lib/settings/integration-status";
import { SettingsField, SettingsFieldList, SettingsSection, SettingsStatusBadge } from "./settings-shared";

type AdminPaymentsSettingsProps = {
  status: PaymentsSettingsStatus;
};

export function AdminPaymentsSettings({ status }: AdminPaymentsSettingsProps) {
  return (
    <SettingsSection title="Payments" icon={CreditCard}>
      <SettingsFieldList>
        <SettingsField
          label="Razorpay configuration"
          value={<SettingsStatusBadge connected={status.razorpayConfigured} />}
        />
        <SettingsField
          label="Webhook status"
          value={<SettingsStatusBadge connected={status.webhookConfigured} />}
        />
        <SettingsField
          label="Manual refunds"
          value={status.manualRefundsEnabled ? "Enabled" : "Disabled"}
        />
        <SettingsField label="COD" value={status.codDisabled ? "Disabled" : "Enabled"} />
      </SettingsFieldList>
    </SettingsSection>
  );
}
