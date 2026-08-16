"use client";

import { Truck } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type PublicShippingSettings = {
  defaultPackageWeightKg: number;
  deliveryProvider: "mock" | "rapido";
  rapidoConfigured: boolean;
};

type BranchOriginPreview = {
  id: string;
  name: string;
  is_default: boolean;
  is_active: boolean;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  local_shipping_charge: number;
  outstation_shipping_charge: number;
};

function mapSavedSettings(raw: Record<string, unknown>): PublicShippingSettings {
  return {
    defaultPackageWeightKg: Number(raw.defaultPackageWeightKg ?? 0.5),
    deliveryProvider: raw.deliveryProvider === "rapido" ? "rapido" : "mock",
    rapidoConfigured: Boolean(raw.rapidoConfigured)
  };
}

export function AdminShippingSettings() {
  const [settings, setSettings] = useState<PublicShippingSettings | null>(null);
  const [branches, setBranches] = useState<BranchOriginPreview[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/shipping-settings")
      .then((res) => res.json())
      .then((data) => {
        const raw = data.settings;
        if (!raw || typeof raw !== "object") {
          setSettings(null);
          return;
        }
        setSettings(mapSavedSettings(raw as Record<string, unknown>));
      });

    void fetch("/api/admin/branches")
      .then((res) => res.json())
      .then((data) => {
        const rows = Array.isArray(data.branches) ? data.branches : [];
        setBranches(
          rows.map((row: Record<string, unknown>) => ({
            id: String(row.id ?? ""),
            name: String(row.name ?? ""),
            is_default: Boolean(row.is_default),
            is_active: Boolean(row.is_active),
            address: String(row.address ?? ""),
            city: String(row.city ?? ""),
            state: String(row.state ?? ""),
            pincode: String(row.pincode ?? ""),
            phone: String(row.phone ?? ""),
            local_shipping_charge: Number(row.local_shipping_charge),
            outstation_shipping_charge: Number(row.outstation_shipping_charge)
          }))
        );
      });
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/shipping-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save shipping settings");
        return;
      }
      const saved = data.settings;
      if (saved && typeof saved === "object") {
        setSettings(mapSavedSettings(saved as Record<string, unknown>));
      }
      toast.success("Shipping settings saved");
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return <p className="text-sm text-foreground/60">Loading shipping settings…</p>;
  }

  return (
    <section className="card-store max-w-2xl space-y-4">
      <h2 className="flex items-center gap-2 font-semibold text-primary">
        <Truck className="h-4 w-4 shrink-0" aria-hidden />
        Shipping &amp; Delivery
      </h2>
      <p className="text-sm text-foreground/70">
        Fulfillment origin, contact details, and shipping rates come from the assigned branch in
        Settings → Branches. Customer delivery addresses at checkout are separate and are not
        edited here.
      </p>

      <div className="rounded-lg border border-border/70 bg-blush/30 px-3 py-3 text-sm">
        <p className="font-medium text-foreground">Branch origin &amp; rates (read-only)</p>
        {branches === null ? (
          <p className="mt-2 text-foreground/60">Loading branch details…</p>
        ) : branches.length === 0 ? (
          <p className="mt-2 text-foreground/60">No branches found. Add them in Settings → Branches.</p>
        ) : (
          <ul className="mt-2 space-y-3 text-foreground/80">
            {branches.map((branch) => {
              const origin = [branch.address, branch.city, branch.state, branch.pincode]
                .filter((part) => part.trim())
                .join(", ");
              return (
                <li key={branch.id}>
                  <p className="font-medium text-foreground">
                    {branch.name}
                    {branch.is_default ? " (default)" : ""}
                    {!branch.is_active ? " (inactive)" : ""}
                  </p>
                  <p>{origin || "No origin address set"}</p>
                  <p>Phone: {branch.phone || "—"}</p>
                  <p>
                    Local ₹{branch.local_shipping_charge} · Outstation ₹
                    {branch.outstation_shipping_charge}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <label className="block text-sm">
        <span className="text-foreground/70">Default Package Weight (kg)</span>
        <input
          type="number"
          min={0.1}
          step={0.1}
          className="mt-1 w-full max-w-xs rounded-lg border px-3 py-2"
          value={settings.defaultPackageWeightKg}
          onChange={(e) =>
            setSettings({ ...settings, defaultPackageWeightKg: Number(e.target.value) })
          }
        />
      </label>

      <label className="block text-sm">
        <span className="text-foreground/70">Delivery Provider</span>
        <select
          className="mt-1 w-full max-w-xs rounded-lg border px-3 py-2"
          value={settings.deliveryProvider}
          onChange={(e) =>
            setSettings({
              ...settings,
              deliveryProvider: e.target.value as "mock" | "rapido"
            })
          }
        >
          <option value="mock">Mock Provider (development)</option>
          <option value="rapido">Rapido</option>
        </select>
      </label>

      <p className="text-xs text-foreground/60">
        Rapido API keys are configured via environment variables{" "}
        <code className="rounded bg-blush px-1">RAPIDO_API_KEY</code> and{" "}
        <code className="rounded bg-blush px-1">RAPIDO_API_SECRET</code>.
        {settings.rapidoConfigured ? " Keys detected." : " Keys not configured — mock provider is used."}
      </p>

      <button type="button" className="btn-primary" disabled={saving} onClick={save}>
        {saving ? "Saving…" : "Save Shipping Settings"}
      </button>
    </section>
  );
}
