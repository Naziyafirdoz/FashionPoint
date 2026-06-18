"use client";

import { useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";

type ColorAlertModalProps = {
  open: boolean;
  onClose: () => void;
  recommendedColor: string;
};

function buildNotificationTypes(notifyEmail: boolean, notifyWhatsApp: boolean): string[] {
  const types: string[] = [];
  if (notifyEmail) types.push("email");
  if (notifyWhatsApp) types.push("whatsapp");
  return types;
}

export function ColorAlertModal({ open, onClose, recommendedColor }: ColorAlertModalProps) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const resetAndClose = () => {
    setEmail("");
    setPhone("");
    setNotifyEmail(true);
    setNotifyWhatsApp(true);
    onClose();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const notificationTypes = buildNotificationTypes(notifyEmail, notifyWhatsApp);

    if (!trimmedEmail && !trimmedPhone) {
      toast.error("Enter an email address or mobile number.");
      return;
    }

    if (!notificationTypes.length) {
      toast.error("Select at least one notification type.");
      return;
    }

    const payload = {
      email: trimmedEmail,
      phone: trimmedPhone,
      color: recommendedColor,
      notificationTypes
    };

    setSaving(true);
    try {
      const res = await fetch("/api/product-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      let data: { ok?: boolean; error?: string; details?: unknown; source?: string } = {};
      const raw = await res.text();
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        console.error("ColorAlertModal: non-JSON response from /api/product-alerts", {
          status: res.status,
          raw
        });
        toast.error("Could not save alert.");
        return;
      }

      if (!res.ok || !data.ok) {
        console.error("ColorAlertModal: save failed", {
          status: res.status,
          source: data.source ?? "src/components/ai/ColorAlertModal.tsx:submit",
          error: data.error,
          details: data.details
        });
        const detail =
          process.env.NODE_ENV === "development" && data.details
            ? ` (${typeof data.details === "string" ? data.details : JSON.stringify(data.details)})`
            : "";
        toast.error(`${data.error ?? "Could not save alert."}${detail}`);
        return;
      }

      toast.success("Alert saved successfully");
      resetAndClose();
    } catch (err) {
      console.error("ColorAlertModal: request error", err);
      const message = err instanceof Error ? err.message : "Could not save alert.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-labelledby="color-alert-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="color-alert-title" className="font-display text-lg font-bold text-primary">
              Notify Me
            </h3>
            <p className="mt-1 text-sm text-foreground/70">
              Get alerted when <span className="font-semibold text-primary">{recommendedColor}</span>{" "}
              blouses are back in stock.
            </p>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-full p-2 text-foreground/60 hover:bg-blush"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mt-5 block text-sm font-medium text-foreground/80">
          Email Address
          <input
            type="email"
            placeholder="you@example.com"
            className="mt-1.5 w-full rounded-lg border border-accent/30 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="mt-3 block text-sm font-medium text-foreground/80">
          Mobile Number
          <input
            type="tel"
            placeholder="+91 98765 43210"
            className="mt-1.5 w-full rounded-lg border border-accent/30 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>

        <p className="mt-2 text-xs text-foreground/55">Provide email or phone — at least one is required.</p>

        <fieldset className="mt-4 space-y-2">
          <legend className="text-sm font-medium text-foreground/80">Notification preference</legend>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground/80">
            <input
              type="checkbox"
              checked={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.checked)}
              className="h-4 w-4 rounded border-accent/40 text-primary focus:ring-primary"
            />
            Email Notification
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground/80">
            <input
              type="checkbox"
              checked={notifyWhatsApp}
              onChange={(e) => setNotifyWhatsApp(e.target.checked)}
              className="h-4 w-4 rounded border-accent/40 text-primary focus:ring-primary"
            />
            WhatsApp Notification
          </label>
        </fieldset>

        <div className="mt-6 flex gap-2">
          <button type="button" onClick={resetAndClose} className="btn-outline flex-1" disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? "Saving…" : "Save Alert"}
          </button>
        </div>
      </form>
    </div>
  );
}
