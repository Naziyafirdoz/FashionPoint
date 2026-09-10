import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase";
import {
  NOTIFICATION_EMAIL_SETTINGS_KEY,
  normalizeRecipientEmail,
  notificationTypeColumn,
  validateRecipientDelete,
  validateRecipientUpdate,
  type NotificationEmailType,
  type NotificationRecipientInput,
  type NotificationRecipientRow
} from "@/lib/settings/notification-recipients";

const RECIPIENT_SELECT =
  "id,email,enabled,notify_new_order,notify_low_stock,notify_cancel_request,notify_refund_request,notify_payment_failed,notify_new_review,notify_contact_form,created_at,updated_at";

/** Stored under store_settings.key = notification_email (JSON). */
export type NotificationEmailSettingsValue = {
  /** Global master switch for admin/staff notification emails. */
  enabled?: boolean;
  /**
   * Delivery Assigned emails to the assigned delivery staff login email.
   * Independent of notification_recipients — does not use that list.
   * Defaults to true when unset.
   */
  delivery_assigned_enabled?: boolean;
};

async function loadNotificationEmailSettingsValue(
  db?: SupabaseClient | null
): Promise<NotificationEmailSettingsValue> {
  const client = db ?? createServiceClient();
  if (!client) return {};

  const { data } = await client
    .from("store_settings")
    .select("value")
    .eq("key", NOTIFICATION_EMAIL_SETTINGS_KEY)
    .maybeSingle();

  if (!data?.value || typeof data.value !== "object" || Array.isArray(data.value)) {
    return {};
  }
  return data.value as NotificationEmailSettingsValue;
}

async function saveNotificationEmailSettingsValue(
  patch: NotificationEmailSettingsValue,
  db?: SupabaseClient | null
): Promise<{ ok: boolean; error?: string }> {
  const client = db ?? createServiceClient();
  if (!client) return { ok: false, error: "Database not configured" };

  const current = await loadNotificationEmailSettingsValue(client);
  const next: NotificationEmailSettingsValue = {
    ...current,
    ...patch
  };

  const { error } = await client.from("store_settings").upsert({
    key: NOTIFICATION_EMAIL_SETTINGS_KEY,
    value: next,
    updated_at: new Date().toISOString()
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function loadEmailNotificationsEnabled(db?: SupabaseClient | null): Promise<boolean> {
  const value = await loadNotificationEmailSettingsValue(db);
  return value.enabled !== false;
}

export async function saveEmailNotificationsEnabled(
  enabled: boolean,
  db?: SupabaseClient | null
): Promise<{ ok: boolean; error?: string }> {
  return saveNotificationEmailSettingsValue({ enabled }, db);
}

/** Whether Delivery Assigned emails may be sent (defaults true). */
export async function loadDeliveryAssignedEmailEnabled(
  db?: SupabaseClient | null
): Promise<boolean> {
  const value = await loadNotificationEmailSettingsValue(db);
  return value.delivery_assigned_enabled !== false;
}

export async function saveDeliveryAssignedEmailEnabled(
  enabled: boolean,
  db?: SupabaseClient | null
): Promise<{ ok: boolean; error?: string }> {
  return saveNotificationEmailSettingsValue({ delivery_assigned_enabled: enabled }, db);
}

export async function listNotificationRecipients(
  db?: SupabaseClient | null
): Promise<NotificationRecipientRow[]> {
  const client = db ?? createServiceClient();
  if (!client) return [];

  const { data, error } = await client
    .from("notification_recipients")
    .select(RECIPIENT_SELECT)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as NotificationRecipientRow[];
}

export async function getNotificationRecipientById(
  id: string,
  db?: SupabaseClient | null
): Promise<NotificationRecipientRow | null> {
  const client = db ?? createServiceClient();
  if (!client) return null;

  const { data, error } = await client
    .from("notification_recipients")
    .select(RECIPIENT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as NotificationRecipientRow;
}

export async function countNotificationRecipients(db?: SupabaseClient | null): Promise<number> {
  const client = db ?? createServiceClient();
  if (!client) return 0;

  const { count } = await client
    .from("notification_recipients")
    .select("id", { count: "exact", head: true });

  return count ?? 0;
}

export async function createNotificationRecipient(
  input: NotificationRecipientInput,
  db?: SupabaseClient | null
): Promise<{ ok: true; recipient: NotificationRecipientRow } | { ok: false; error: string }> {
  const client = db ?? createServiceClient();
  if (!client) return { ok: false, error: "Database not configured" };

  const now = new Date().toISOString();
  const { data, error } = await client
    .from("notification_recipients")
    .insert({
      ...input,
      email: normalizeRecipientEmail(input.email),
      updated_at: now
    })
    .select(RECIPIENT_SELECT)
    .single();

  if (error) {
    const message =
      error.code === "23505" ? "A recipient with this email already exists" : error.message;
    return { ok: false, error: message };
  }

  return { ok: true, recipient: data as NotificationRecipientRow };
}

export async function updateNotificationRecipient(
  id: string,
  input: NotificationRecipientInput,
  db?: SupabaseClient | null
): Promise<
  | { ok: true; recipient: NotificationRecipientRow }
  | { ok: false; error: string; conflict?: boolean }
> {
  const client = db ?? createServiceClient();
  if (!client) return { ok: false, error: "Database not configured" };

  const existing = await listNotificationRecipients(client);
  const minimumEnabledError = validateRecipientUpdate(existing, id, input.enabled);
  if (minimumEnabledError) {
    return { ok: false, error: minimumEnabledError, conflict: true };
  }

  const { data, error } = await client
    .from("notification_recipients")
    .update({
      ...input,
      email: normalizeRecipientEmail(input.email),
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select(RECIPIENT_SELECT)
    .single();

  if (error) {
    const message =
      error.code === "23505" ? "A recipient with this email already exists" : error.message;
    return { ok: false, error: message };
  }

  if (!data) return { ok: false, error: "Recipient not found" };
  return { ok: true, recipient: data as NotificationRecipientRow };
}

export async function deleteNotificationRecipient(
  id: string,
  db?: SupabaseClient | null
): Promise<{ ok: boolean; error?: string; conflict?: boolean }> {
  const client = db ?? createServiceClient();
  if (!client) return { ok: false, error: "Database not configured" };

  const existing = await listNotificationRecipients(client);
  const minimumEnabledError = validateRecipientDelete(existing, id);
  if (minimumEnabledError) {
    return { ok: false, error: minimumEnabledError, conflict: true };
  }

  const target = existing.find((recipient) => recipient.id === id);
  if (!target) return { ok: false, error: "Recipient not found" };

  const { error, count } = await client
    .from("notification_recipients")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  if (!count) return { ok: false, error: "Recipient not found" };
  return { ok: true };
}

export async function getNotificationRecipientEmails(
  type: NotificationEmailType,
  db?: SupabaseClient | null
): Promise<string[]> {
  const client = db ?? createServiceClient();
  if (!client) return [];

  const enabled = await loadEmailNotificationsEnabled(client);
  if (!enabled) return [];

  const column = notificationTypeColumn(type);
  const { data, error } = await client
    .from("notification_recipients")
    .select("email")
    .eq("enabled", true)
    .eq(column, true);

  if (error || !data?.length) return [];

  const emails: string[] = [];
  const seen = new Set<string>();
  for (const row of data) {
    const email = normalizeRecipientEmail(String(row.email ?? ""));
    if (!email || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }

  return emails;
}
