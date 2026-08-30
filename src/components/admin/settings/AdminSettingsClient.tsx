"use client";

import { useState } from "react";
import {
  CreditCard,
  Bell,
  Palette,
  PlugZap,
  Settings,
  Store,
  Truck,
  Package,
  type LucideIcon
} from "lucide-react";
import type { IntegrationStatusItem, PaymentsSettingsStatus } from "@/lib/settings/integration-status";
import type { StoreInformation } from "@/lib/settings/store-information";
import { AdminGeneralSettings } from "./AdminGeneralSettings";
import { AdminIntegrationsSettings } from "./AdminIntegrationsSettings";
import { AdminNotificationSettings } from "./AdminNotificationSettings";
import { AdminPaymentsSettings } from "./AdminPaymentsSettings";
import { AdminShippingSettings } from "./AdminShippingSettings";
import { AdminStoreInformation } from "./AdminStoreInformation";
import { AdminBrandingSettings } from "./AdminBrandingSettings";
import { AdminBranchesSettings } from "./AdminBranchesSettings";

type SettingsSectionId =
  | "general"
  | "store"
  | "branding"
  | "shipping"
  | "branches"
  | "payments"
  | "integrations"
  | "notifications";

type ActiveSection = {
  id: SettingsSectionId;
  label: string;
  icon: LucideIcon;
};

const ACTIVE_SECTIONS: ActiveSection[] = [
  { id: "general", label: "General", icon: Settings },
  { id: "store", label: "Store Information", icon: Store },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "shipping", label: "Shipping", icon: Truck },
  { id: "branches", label: "Branches", icon: Package },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "integrations", label: "Integrations", icon: PlugZap },
  { id: "notifications", label: "Notifications", icon: Bell }
];

const FUTURE_SECTIONS = [
  "Email Templates",
  "Staff & Roles",
  "AI Settings",
  "Backup & Security",
  "System Logs"
] as const;

type AdminSettingsClientProps = {
  integrations: IntegrationStatusItem[];
  payments: PaymentsSettingsStatus;
  initialStoreInformation: StoreInformation;
};

export function AdminSettingsClient({
  integrations,
  payments,
  initialStoreInformation
}: AdminSettingsClientProps) {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("general");

  return (
    <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-start">
      <nav className="shrink-0 lg:w-56" aria-label="Settings sections">
        <div className="space-y-1">
          {ACTIVE_SECTIONS.map(({ id, label, icon: Icon }) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  active ? "bg-primary text-white" : "text-foreground/70 hover:bg-blush"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-left">{label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 space-y-1 border-t border-accent/20 pt-4">
          {FUTURE_SECTIONS.map((label) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground/40"
              aria-disabled
            >
              <span className="text-left">{label}</span>
            </div>
          ))}
        </div>
      </nav>

      <div className="min-w-0 flex-1">
        {activeSection === "general" && (
          <AdminGeneralSettings storeInformation={initialStoreInformation} />
        )}
        {activeSection === "store" && (
          <AdminStoreInformation initialStoreInformation={initialStoreInformation} />
        )}
        {activeSection === "branding" && (
          <AdminBrandingSettings initialStoreInformation={initialStoreInformation} />
        )}
        {activeSection === "shipping" && <AdminShippingSettings />}
        {activeSection === "branches" && <AdminBranchesSettings />}
        {activeSection === "payments" && <AdminPaymentsSettings status={payments} />}
        {activeSection === "integrations" && (
          <AdminIntegrationsSettings integrations={integrations} />
        )}
        {activeSection === "notifications" && <AdminNotificationSettings />}
      </div>
    </div>
  );
}
