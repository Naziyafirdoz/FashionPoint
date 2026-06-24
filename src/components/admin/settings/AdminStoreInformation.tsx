import { Store } from "lucide-react";
import {
  STORE_ADDRESS,
  STORE_NAME,
  STORE_PHONE_PRIMARY_DISPLAY,
  SUPPORT_EMAIL
} from "@/lib/site-config";
import { SettingsField, SettingsFieldList, SettingsSection } from "./settings-shared";

export function AdminStoreInformation() {
  return (
    <SettingsSection title="Store Information" icon={Store}>
      <SettingsFieldList>
        <SettingsField label="Store name" value={STORE_NAME} />
        <SettingsField label="Address" value={STORE_ADDRESS} />
        <SettingsField label="Primary phone" value={STORE_PHONE_PRIMARY_DISPLAY} />
        <SettingsField label="Support email" value={SUPPORT_EMAIL} />
      </SettingsFieldList>
    </SettingsSection>
  );
}
