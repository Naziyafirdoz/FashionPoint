import { PlugZap } from "lucide-react";
import type { IntegrationStatusItem } from "@/lib/settings/integration-status";
import { SettingsSection, SettingsStatusBadge } from "./settings-shared";

type AdminIntegrationsSettingsProps = {
  integrations: IntegrationStatusItem[];
};

export function AdminIntegrationsSettings({ integrations }: AdminIntegrationsSettingsProps) {
  return (
    <SettingsSection title="Integrations" icon={PlugZap}>
      <div className="grid gap-3 sm:grid-cols-2">
        {integrations.map((integration) => (
          <div
            key={integration.name}
            className="flex items-center justify-between rounded-xl border border-accent/20 bg-white p-4 shadow-card"
          >
            <p className="text-sm font-semibold text-foreground">{integration.name}</p>
            <SettingsStatusBadge connected={integration.connected} />
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}
