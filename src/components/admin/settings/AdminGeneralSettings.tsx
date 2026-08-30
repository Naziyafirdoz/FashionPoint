import { Settings } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import type { StoreInformation } from "@/lib/settings/store-information";
import {
  STORE_CURRENCY,
  STORE_MAINTENANCE_MODE,
  STORE_TIMEZONE
} from "@/lib/site-config";
import { SettingsField, SettingsFieldList, SettingsSection } from "./settings-shared";

export function AdminGeneralSettings({ storeInformation }: { storeInformation: StoreInformation }) {
  return (
    <SettingsSection title="General" icon={Settings}>
      <SettingsFieldList>
        <SettingsField label="Store name" value={storeInformation.storeName} />
        <SettingsField
          label="Logo"
          value={
            <div className="mt-1 inline-flex rounded-lg border border-accent/20 bg-white p-3">
              <BrandLogo
                variant="dark"
                src={storeInformation.logoUrl || undefined}
                alt={storeInformation.storeName}
              />
            </div>
          }
        />
        <SettingsField label="Currency" value={STORE_CURRENCY} />
        <SettingsField label="Timezone" value={STORE_TIMEZONE} />
        <SettingsField
          label="Maintenance mode"
          value={STORE_MAINTENANCE_MODE ? "Enabled" : "Disabled"}
        />
      </SettingsFieldList>
    </SettingsSection>
  );
}
