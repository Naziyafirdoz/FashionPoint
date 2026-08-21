import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveNotificationRecipientEmails } from "@/lib/admin/notification-recipient-resolver";
import { getDailyPendingActions } from "@/lib/server/notifications/daily-pending-actions";
import { buildDailyPendingDigestEmail } from "@/lib/server/notifications/daily-pending-digest-email";
import { RESEND_FROM_ALERTS } from "@/lib/server/resend-from-addresses";
import {
  calendarDateInTimeZone,
  DAILY_PENDING_ACTION_DIGEST_EVENT,
  digestDateLogMarker,
  formatDigestDateLabel,
  isAtOrAfterConfiguredTime,
  type DailyPendingActionReminderSettings
} from "@/lib/settings/daily-pending-action-reminder";
import {
  loadDailyPendingActionReminderSettings,
  loadEmailNotificationsEnabled
} from "@/lib/settings/notification-recipients-store";

export type DailyPendingDigestResult =
  | {
      ok: true;
      skipped: true;
      reason:
        | "global_email_disabled"
        | "digest_disabled"
        | "outside_time_window"
        | "already_sent"
        | "no_pending_actions"
        | "no_recipients";
      digestDate: string;
      totalPending?: number;
    }
  | {
      ok: true;
      sent: true;
      totalPending: number;
      digestDate: string;
      recipientCount: number;
    }
  | { ok: false; error: string; digestDate?: string };

export type RunDailyPendingDigestOptions = {
  now?: Date;
  skipTimeWindow?: boolean;
};

async function wasDigestSentForDate(
  db: SupabaseClient,
  digestDate: string
): Promise<boolean> {
  const marker = digestDateLogMarker(digestDate);
  const { data, error } = await db
    .from("notification_logs")
    .select("id")
    .eq("channel", "email")
    .eq("event", DAILY_PENDING_ACTION_DIGEST_EVENT)
    .eq("success", true)
    .eq("error_message", marker)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to check digest history: ${error.message}`);
  }

  return Boolean(data);
}

async function logDigestAttempt(
  db: SupabaseClient,
  input: { success: boolean; digestDate: string; errorMessage?: string }
): Promise<void> {
  const { error } = await db.from("notification_logs").insert({
    order_id: null,
    channel: "email",
    event: DAILY_PENDING_ACTION_DIGEST_EVENT,
    success: input.success,
    error_message: input.success
      ? digestDateLogMarker(input.digestDate)
      : input.errorMessage?.slice(0, 500) ?? "Email send failed"
  });

  if (error) {
    console.error("[daily-pending-digest] failed to write notification_logs", {
      message: error.message
    });
  }
}

async function sendDigestEmail(
  recipients: string[],
  html: string,
  subject: string
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) throw new Error("RESEND_API_KEY not configured");

  const { Resend } = await import("resend");
  const resend = new Resend(resendKey);
  const result = await resend.emails.send({
    from: RESEND_FROM_ALERTS,
    to: recipients,
    subject,
    html
  });

  if (result.error) {
    throw new Error(result.error.message || "Resend rejected the digest email");
  }
}

export async function runDailyPendingActionDigest(
  db: SupabaseClient,
  options: RunDailyPendingDigestOptions = {}
): Promise<DailyPendingDigestResult> {
  const now = options.now ?? new Date();
  let settings: DailyPendingActionReminderSettings;

  try {
    settings = await loadDailyPendingActionReminderSettings(db);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to load digest settings";
    console.error("[daily-pending-digest] settings load failed", { message });
    return { ok: false, error: "settings_load_failed" };
  }

  const digestDate = calendarDateInTimeZone(now, settings.timezone);
  console.info("[daily-pending-digest] invoked", {
    digestDate,
    timezone: settings.timezone,
    configuredTime: settings.time,
    digestEnabled: settings.enabled,
    sendOnlyIfPending: settings.sendOnlyIfPending,
    combineIntoOneEmail: settings.combineIntoOneEmail
  });

  const globalEnabled = await loadEmailNotificationsEnabled(db);
  if (!globalEnabled) {
    console.info("[daily-pending-digest] skipped", { reason: "global_email_disabled", digestDate });
    return { ok: true, skipped: true, reason: "global_email_disabled", digestDate };
  }

  if (!settings.enabled) {
    console.info("[daily-pending-digest] skipped", { reason: "digest_disabled", digestDate });
    return { ok: true, skipped: true, reason: "digest_disabled", digestDate };
  }

  if (
    !options.skipTimeWindow &&
    !isAtOrAfterConfiguredTime(now, settings.time, settings.timezone)
  ) {
    console.info("[daily-pending-digest] skipped", {
      reason: "outside_time_window",
      digestDate,
      configuredTime: settings.time
    });
    return { ok: true, skipped: true, reason: "outside_time_window", digestDate };
  }

  try {
    if (await wasDigestSentForDate(db, digestDate)) {
      console.info("[daily-pending-digest] skipped", { reason: "already_sent", digestDate });
      return { ok: true, skipped: true, reason: "already_sent", digestDate };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "history_check_failed";
    console.error("[daily-pending-digest] history check failed", { message, digestDate });
    return { ok: false, error: "history_check_failed", digestDate };
  }

  let counts;
  try {
    counts = await getDailyPendingActions(db);
  } catch (err) {
    const message = err instanceof Error ? err.message : "query_failed";
    console.error("[daily-pending-digest] pending-action query failed", { message, digestDate });
    return { ok: false, error: "query_failed", digestDate };
  }

  if (counts.total === 0) {
    console.info("[daily-pending-digest] skipped", {
      reason: "no_pending_actions",
      digestDate
    });
    return { ok: true, skipped: true, reason: "no_pending_actions", digestDate };
  }

  const recipients = await resolveNotificationRecipientEmails("new_order", db);
  if (!recipients.length) {
    console.info("[daily-pending-digest] skipped", { reason: "no_recipients", digestDate });
    return { ok: true, skipped: true, reason: "no_recipients", digestDate };
  }

  const dateLabel = formatDigestDateLabel(now, settings.timezone);
  const template = buildDailyPendingDigestEmail(counts, dateLabel);

  try {
    await sendDigestEmail(recipients, template.html, template.subject);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    console.error("[daily-pending-digest] email failed", { message, digestDate });
    await logDigestAttempt(db, { success: false, digestDate, errorMessage: message });
    return { ok: false, error: "email_failed", digestDate };
  }

  await logDigestAttempt(db, { success: true, digestDate });
  console.info("[daily-pending-digest] sent", {
    digestDate,
    totalPending: counts.total,
    recipientCount: recipients.length,
    newOrders: counts.newOrders,
    lowStock: counts.lowStock,
    outOfStock: counts.outOfStock,
    cancellationRequests: counts.cancellationRequests,
    refundPending: counts.refundPending
  });

  return {
    ok: true,
    sent: true,
    totalPending: counts.total,
    digestDate,
    recipientCount: recipients.length
  };
}
