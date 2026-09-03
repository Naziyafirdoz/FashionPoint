import type { SupabaseClient } from "@supabase/supabase-js";
import { buildNotificationTestEmail } from "@/lib/server/notifications/email-templates";
import { logNotificationDelivery } from "@/lib/server/notifications/notification-service";
import { getResendFromAlerts } from "@/lib/server/resend-from-addresses";
import {
  isValidRecipientEmail,
  normalizeRecipientEmail,
  type NotificationRecipientRow
} from "@/lib/settings/notification-recipients";

export const NOTIFICATION_TEST_EMAIL_EVENT = "notification_test";

export async function sendNotificationTestEmail(
  db: SupabaseClient,
  recipient: NotificationRecipientRow
): Promise<{ ok: true } | { ok: false; message: string }> {
  const email = normalizeRecipientEmail(recipient.email);
  if (!isValidRecipientEmail(email)) {
    return { ok: false, message: "Invalid recipient email address" };
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    await logNotificationDelivery(db, {
      orderId: null,
      channel: "email",
      event: NOTIFICATION_TEST_EMAIL_EVENT,
      success: false,
      errorMessage: "RESEND_API_KEY not configured"
    });
    return { ok: false, message: "Email service not configured" };
  }

  const sentAt = new Date();
  const template = await buildNotificationTestEmail(sentAt);

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);
    const response = await resend.emails.send({
      from: await getResendFromAlerts(),
      to: email,
      subject: template.subject,
      html: template.html
    });

    if (response.error) {
      throw new Error(response.error.message ?? "Resend send failed");
    }

    console.info("[notification-test-email] sent", {
      recipientId: recipient.id,
      recipientEmail: email,
      sentAt: sentAt.toISOString()
    });

    await logNotificationDelivery(db, {
      orderId: null,
      channel: "email",
      event: NOTIFICATION_TEST_EMAIL_EVENT,
      success: true
    });

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email send failed";
    console.error("[notification-test-email] failed", {
      recipientId: recipient.id,
      recipientEmail: email,
      sentAt: sentAt.toISOString(),
      error: message
    });

    await logNotificationDelivery(db, {
      orderId: null,
      channel: "email",
      event: NOTIFICATION_TEST_EMAIL_EVENT,
      success: false,
      errorMessage: message
    });

    return { ok: false, message };
  }
}
