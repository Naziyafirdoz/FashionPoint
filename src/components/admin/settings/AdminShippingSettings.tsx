"use client";

import { Truck } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type PublicShippingSettings = {
  localShippingCharge: number;
  outstationShippingCharge: number;
  storePickupAddress: string;
  storePickupCity: string;
  storePickupPincode: string;
  storePickupPhone: string;
  defaultPackageWeightKg: number;
  deliveryProvider: "mock" | "rapido";
  rapidoConfigured: boolean;
};

export function AdminShippingSettings() {
  const [settings, setSettings] = useState<PublicShippingSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/shipping-settings")
      .then((res) => res.json())
      .then((data) => setSettings(data.settings ?? null));
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
      setSettings(data.settings);
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
        Shipping is calculated automatically from the customer&apos;s delivery address. Vijayawada
        orders use the local charge; all other cities use the outstation charge.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-foreground/70">Local Shipping Charge (Vijayawada)</span>
          <input
            type="number"
            min={0}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={settings.localShippingCharge}
            onChange={(e) =>
              setSettings({ ...settings, localShippingCharge: Number(e.target.value) })
            }
          />
        </label>
        <label className="block text-sm">
          <span className="text-foreground/70">Outstation Shipping Charge</span>
          <input
            type="number"
            min={0}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={settings.outstationShippingCharge}
            onChange={(e) =>
              setSettings({ ...settings, outstationShippingCharge: Number(e.target.value) })
            }
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-foreground/70">Store Pickup Address</span>
        <textarea
          className="mt-1 w-full rounded-lg border px-3 py-2"
          rows={3}
          value={settings.storePickupAddress}
          onChange={(e) => setSettings({ ...settings, storePickupAddress: e.target.value })}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="text-foreground/70">Pickup City</span>
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={settings.storePickupCity}
            onChange={(e) => setSettings({ ...settings, storePickupCity: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="text-foreground/70">Pickup Pincode</span>
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={settings.storePickupPincode}
            onChange={(e) => setSettings({ ...settings, storePickupPincode: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="text-foreground/70">Pickup Phone</span>
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={settings.storePickupPhone}
            onChange={(e) => setSettings({ ...settings, storePickupPhone: e.target.value })}
          />
        </label>
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
