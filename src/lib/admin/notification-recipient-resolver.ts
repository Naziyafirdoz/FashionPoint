import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getAdminEmail,
  getStaffOrderAlertEmails
} from "@/lib/admin/admin-contacts";
import {
  countNotificationRecipients,
  getNotificationRecipientEmails,
  loadEmailNotificationsEnabled
} from "@/lib/settings/notification-recipients-store";
import type { NotificationEmailType } from "@/lib/settings/notification-recipients";

/** Resolve admin email recipients for a notification type (DB-first, env fallback). */
export async function resolveNotificationRecipientEmails(
  type: NotificationEmailType,
  db?: SupabaseClient | null
): Promise<string[]> {
  const enabled = await loadEmailNotificationsEnabled(db);
  if (!enabled) return [];

  const recipients = await getNotificationRecipientEmails(type, db);
  if (recipients.length > 0) return recipients;

  const totalRecipients = await countNotificationRecipients(db);
  if (totalRecipients > 0) return [];

  if (type === "new_order") {
    return getStaffOrderAlertEmails();
  }

  if (type === "low_stock") {
    const admin = getAdminEmail();
    return admin ? [admin] : [];
  }

  return [];
}

export async function areEmailNotificationsEnabled(db?: SupabaseClient | null): Promise<boolean> {
  return loadEmailNotificationsEnabled(db);
}
