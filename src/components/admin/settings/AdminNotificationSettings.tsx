"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Loader2, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SettingsSection } from "./settings-shared";
import { NotificationRecipientFormModal } from "./NotificationRecipientFormModal";
import {
  countEnabledRecipients,
  formatRecipientNotificationsSummary,
  validateRecipientDelete,
  validateRecipientUpdate,
  type NotificationRecipientInput,
  type NotificationRecipientRow
} from "@/lib/settings/notification-recipients";

export function AdminNotificationSettings() {
  const [loading, setLoading] = useState(true);
  const [savingEnabled, setSavingEnabled] = useState(false);
  const [savingRecipient, setSavingRecipient] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [recipients, setRecipients] = useState<NotificationRecipientRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NotificationRecipientRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NotificationRecipientRow | null>(null);
  const [testTarget, setTestTarget] = useState<NotificationRecipientRow | null>(null);
  const [sendingTestId, setSendingTestId] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notification-settings");
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to load notification settings");
        return;
      }
      setEmailNotificationsEnabled(Boolean(data.emailNotificationsEnabled));
      setRecipients(data.recipients ?? []);
    } catch {
      toast.error("Failed to load notification settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const saveEmailEnabled = async (enabled: boolean) => {
    setSavingEnabled(true);
    try {
      const res = await fetch("/api/admin/notification-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailNotificationsEnabled: enabled })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save notification settings");
        setEmailNotificationsEnabled((current) => !enabled);
        return;
      }
      setEmailNotificationsEnabled(Boolean(data.emailNotificationsEnabled));
      toast.success("Notification settings saved");
    } catch {
      toast.error("Failed to save notification settings");
      setEmailNotificationsEnabled((current) => !enabled);
    } finally {
      setSavingEnabled(false);
    }
  };

  const saveRecipient = async (values: NotificationRecipientInput) => {
    if (editing) {
      const minimumEnabledError = validateRecipientUpdate(recipients, editing.id, values.enabled);
      if (minimumEnabledError) {
        toast.error(minimumEnabledError);
        return;
      }
    }

    setSavingRecipient(true);
    try {
      const isEdit = Boolean(editing);
      const res = await fetch(
        isEdit ? `/api/admin/notification-recipients/${editing!.id}` : "/api/admin/notification-recipients",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values)
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save recipient");
        return;
      }
      toast.success(isEdit ? "Recipient updated" : "Recipient added");
      setModalOpen(false);
      setEditing(null);
      if (data.recipient) {
        setRecipients((current) => {
          const exists = current.some((recipient) => recipient.id === data.recipient.id);
          return exists
            ? current.map((recipient) =>
                recipient.id === data.recipient.id ? data.recipient : recipient
              )
            : [...current, data.recipient];
        });
      } else {
        await loadSettings();
      }
    } catch {
      toast.error("Failed to save recipient");
    } finally {
      setSavingRecipient(false);
    }
  };

  const confirmSendTest = async () => {
    if (!testTarget) return;

    setSendingTestId(testTarget.id);
    try {
      const res = await fetch(`/api/admin/notification-recipients/${testTarget.id}/test`, {
        method: "POST"
      });

      if (!res.ok) {
        toast.error("Unable to send test email.");
        return;
      }

      toast.success("Test email sent successfully.");
      setTestTarget(null);
    } catch {
      toast.error("Unable to send test email.");
    } finally {
      setSendingTestId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    const minimumEnabledError = validateRecipientDelete(recipients, deleteTarget.id);
    if (minimumEnabledError) {
      toast.error(minimumEnabledError);
      return;
    }

    setDeletingId(deleteTarget.id);
    try {
      const res = await fetch(`/api/admin/notification-recipients/${deleteTarget.id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to delete recipient");
        return;
      }
      toast.success("Recipient deleted");
      const deletedId = deleteTarget.id;
      setDeleteTarget(null);
      setRecipients((current) => current.filter((recipient) => recipient.id !== deletedId));
    } catch {
      toast.error("Failed to delete recipient");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-foreground/60">Loading notification settings…</p>;
  }

  const enabledRecipientCount = countEnabledRecipients(recipients);
  const showDeliveryWarning = emailNotificationsEnabled && enabledRecipientCount === 0;

  return (
    <div className="space-y-6">
      {showDeliveryWarning ? (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <p className="font-semibold">
            Email notifications are enabled, but there are no active recipients.
          </p>
          <p className="mt-1 text-amber-800">
            Notification emails will not be delivered until at least one recipient is enabled.
          </p>
        </div>
      ) : null}
      <SettingsSection title="Notification Settings" icon={Bell}>
        <p className="text-sm text-foreground/70">
          Manage email notification recipients and preferences.
        </p>
        <label className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-accent/15 bg-blush/20 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Enable Email Notifications</p>
            <p className="mt-1 text-xs text-foreground/60">
              When disabled, no notification emails are sent.
            </p>
          </div>
          <input
            type="checkbox"
            className="h-5 w-5 rounded border-accent/30"
            checked={emailNotificationsEnabled}
            disabled={savingEnabled}
            onChange={(event) => {
              const enabled = event.target.checked;
              setEmailNotificationsEnabled(enabled);
              void saveEmailEnabled(enabled);
            }}
            aria-label="Enable email notifications"
          />
        </label>
      </SettingsSection>

      <section className="card-store max-w-5xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-semibold text-primary">Email Recipients</h2>
            <p className="mt-1 text-sm text-foreground/70">
              Manage who will receive notification emails.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            + Add Recipient
          </Button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-accent/20 text-foreground/60">
                <th className="px-3 py-2 font-medium">Recipient Email</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Notifications</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recipients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-foreground/60">
                    No recipients configured yet.
                  </td>
                </tr>
              ) : (
                recipients.map((recipient) => (
                  <tr key={recipient.id} className="border-b border-accent/10">
                    <td className="px-3 py-3 font-medium text-foreground">{recipient.email}</td>
                    <td className="px-3 py-3">
                      <Badge variant={recipient.enabled ? "gold" : "soft"}>
                        {recipient.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-foreground/70">
                      {formatRecipientNotificationsSummary(recipient)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="text-sm font-medium text-primary hover:underline"
                          onClick={() => {
                            setEditing(recipient);
                            setModalOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-sm font-medium text-red-700 hover:underline"
                          onClick={() => setDeleteTarget(recipient)}
                        >
                          Delete
                        </button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={sendingTestId === recipient.id}
                          onClick={() => setTestTarget(recipient)}
                          className="inline-flex items-center gap-1.5"
                        >
                          {sendingTestId === recipient.id ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                              Sending…
                            </>
                          ) : (
                            <>
                              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                              Send Test
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <NotificationRecipientFormModal
        open={modalOpen}
        title={editing ? "Edit Recipient" : "Add Recipient"}
        initial={editing}
        saving={savingRecipient}
        onClose={() => {
          if (savingRecipient) return;
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={saveRecipient}
      />

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-recipient-title"
            className="w-full max-w-md rounded-2xl border border-accent/20 bg-white p-6 shadow-xl"
          >
            <h3 id="delete-recipient-title" className="font-semibold text-primary">
              Delete recipient?
            </h3>
            <p className="mt-2 text-sm text-foreground/70">
              Remove <strong>{deleteTarget.email}</strong> from notification recipients? This cannot
              be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={Boolean(deletingId)}
              >
                Cancel
              </Button>
              <Button onClick={() => void confirmDelete()} disabled={Boolean(deletingId)}>
                {deletingId ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {testTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="send-test-email-title"
            className="w-full max-w-md rounded-2xl border border-accent/20 bg-white p-6 shadow-xl"
          >
            <h3 id="send-test-email-title" className="font-semibold text-primary">
              Send Test Email
            </h3>
            <p className="mt-2 text-sm text-foreground/70">
              Send a test notification email to:
              <br />
              <strong>{testTarget.email}</strong>
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setTestTarget(null)}
                disabled={sendingTestId === testTarget.id}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void confirmSendTest()}
                disabled={sendingTestId === testTarget.id}
                className="inline-flex items-center gap-1.5"
              >
                {sendingTestId === testTarget.id ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    Sending…
                  </>
                ) : (
                  "Send"
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
