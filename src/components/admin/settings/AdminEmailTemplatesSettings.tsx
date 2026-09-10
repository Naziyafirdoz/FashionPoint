"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SettingsSection } from "./settings-shared";
import {
  EMAIL_TEMPLATE_VARIABLES,
  emailTemplateEventLabel,
  type EmailTemplateRow
} from "@/lib/settings/email-templates";

export function AdminEmailTemplatesSettings() {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<EmailTemplateRow[]>([]);
  const [editing, setEditing] = useState<EmailTemplateRow | null>(null);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [migrationMissing, setMigrationMissing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/email-templates", { credentials: "include" });
      const data = await res.json();
      if (res.status === 503) {
        setMigrationMissing(true);
        setTemplates([]);
        toast.error(data.error ?? "Email templates migration required");
        return;
      }
      if (!res.ok) {
        toast.error(data.error ?? "Failed to load email templates");
        return;
      }
      setMigrationMissing(false);
      setTemplates((data.templates as EmailTemplateRow[]) ?? []);
    } catch {
      toast.error("Failed to load email templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (row: EmailTemplateRow) => {
    setEditing(row);
    setSubject(row.subject);
    setBodyHtml(row.body_html);
  };

  const closeEdit = () => {
    if (saving) return;
    setEditing(null);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_key: editing.event_key,
          subject,
          body_html: bodyHtml,
          is_active: true
        })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save template");
        return;
      }
      toast.success("Email template saved — future emails will use this version");
      setEditing(null);
      await load();
    } catch {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const resetDefault = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_key: editing.event_key,
          reset_to_default: true
        })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to reset template");
        return;
      }
      const tpl = data.template as EmailTemplateRow;
      setSubject(tpl.subject);
      setBodyHtml(tpl.body_html);
      toast.success("Restored Fashion Point default template");
      await load();
    } catch {
      toast.error("Failed to reset template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection title="Email Templates" icon={Mail}>
      <p className="mb-4 text-sm text-foreground/70">
        Edit the active customer email for each order event. Changes apply to future
        sends automatically. Use variables like{" "}
        <code className="rounded bg-blush/50 px-1">{"{{order_number}}"}</code>.
      </p>

      {migrationMissing ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Apply the <code>email_templates</code> Supabase migration, then refresh this
          page.
        </p>
      ) : null}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-foreground/60">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading templates…
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-accent/20">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-blush/40 text-foreground/70">
              <tr>
                <th className="px-3 py-2 font-medium">Event</th>
                <th className="px-3 py-2 font-medium">Subject</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((row) => (
                <tr key={row.event_key} className="border-t border-accent/15">
                  <td className="px-3 py-2 font-medium text-foreground">
                    {emailTemplateEventLabel(row.event_key)}
                  </td>
                  <td className="max-w-[240px] truncate px-3 py-2 text-foreground/80">
                    {row.subject}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={row.is_active ? "gold" : "soft"}>
                      {row.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="!px-2.5 !py-1 text-xs"
                      onClick={() => openEdit(row)}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-accent/20 bg-blush/20 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Available variables
        </p>
        <ul className="mt-2 flex flex-wrap gap-2 text-xs text-foreground/70">
          {EMAIL_TEMPLATE_VARIABLES.map((v) => (
            <li key={v.key} className="rounded-md bg-white px-2 py-1 border border-accent/15">
              {`{{${v.key}}}`}
            </li>
          ))}
        </ul>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-accent/20 bg-white shadow-xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-accent/15 px-5 py-4">
              <div>
                <h3 className="font-semibold text-primary">
                  Edit — {emailTemplateEventLabel(editing.event_key)}
                </h3>
                <p className="mt-1 text-xs text-foreground/60">
                  Active template used when this order event email is sent.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-full p-1 text-foreground/50 hover:bg-blush"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-5 py-4">
              <label className="block text-sm">
                <span className="text-foreground/70">Subject</span>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-foreground/70">HTML body</span>
                <textarea
                  className="mt-1 min-h-[320px] w-full rounded-lg border px-3 py-2 font-mono text-xs leading-relaxed"
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  spellCheck={false}
                />
              </label>
            </div>

            <div className="flex flex-wrap justify-between gap-2 border-t border-accent/15 px-5 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => void resetDefault()}
                disabled={saving}
              >
                Reset to default
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={closeEdit} disabled={saving}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => void save()} disabled={saving}>
                  {saving ? "Saving…" : "Save template"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </SettingsSection>
  );
}
