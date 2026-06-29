"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  NOTIFICATION_TYPE_OPTIONS,
  type NotificationRecipientInput,
  type NotificationRecipientRow
} from "@/lib/settings/notification-recipients";

type NotificationRecipientFormModalProps = {
  open: boolean;
  title: string;
  initial?: NotificationRecipientRow | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: NotificationRecipientInput) => Promise<void>;
};

const EMPTY_FORM: NotificationRecipientInput = {
  email: "",
  enabled: true,
  notify_new_order: true,
  notify_low_stock: false,
  notify_cancel_request: false,
  notify_refund_request: false,
  notify_payment_failed: false,
  notify_new_review: false,
  notify_contact_form: false
};

export function NotificationRecipientFormModal({
  open,
  title,
  initial,
  saving,
  onClose,
  onSubmit
}: NotificationRecipientFormModalProps) {
  const [form, setForm] = useState<NotificationRecipientInput>(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        email: initial.email,
        enabled: initial.enabled,
        notify_new_order: initial.notify_new_order,
        notify_low_stock: initial.notify_low_stock,
        notify_cancel_request: initial.notify_cancel_request,
        notify_refund_request: initial.notify_refund_request,
        notify_payment_failed: initial.notify_payment_failed,
        notify_new_review: initial.notify_new_review,
        notify_contact_form: initial.notify_contact_form
      });
      return;
    }
    setForm(EMPTY_FORM);
  }, [open, initial]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-recipient-modal-title"
        className="w-full max-w-lg rounded-2xl border border-accent/20 bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h3 id="notification-recipient-modal-title" className="font-semibold text-primary">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-foreground/50 hover:bg-blush hover:text-primary"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <label className="block text-sm">
            <span className="text-foreground/70">Recipient Email</span>
            <input
              type="email"
              required
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="name@example.com"
            />
          </label>

          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-accent/30"
              checked={form.enabled}
              onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
            />
            <span className="font-medium text-foreground">Enabled</span>
          </label>

          <fieldset>
            <legend className="text-sm font-medium text-foreground">Notification Types</legend>
            <div className="mt-3 space-y-2">
              {NOTIFICATION_TYPE_OPTIONS.map((option) => (
                <label key={option.key} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-accent/30"
                    checked={form[option.key]}
                    onChange={(event) =>
                      setForm({ ...form, [option.key]: event.target.checked })
                    }
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
