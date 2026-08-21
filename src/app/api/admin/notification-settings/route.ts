import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { parseDailyPendingActionReminderPatch } from "@/lib/settings/daily-pending-action-reminder";
import {
  listNotificationRecipients,
  loadDailyPendingActionReminderSettings,
  loadEmailNotificationsEnabled,
  saveDailyPendingActionReminderSettings,
  saveEmailNotificationsEnabled
} from "@/lib/settings/notification-recipients-store";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const [emailNotificationsEnabled, recipients, dailyPendingActionReminder] = await Promise.all([
    loadEmailNotificationsEnabled(auth.ctx.db),
    listNotificationRecipients(auth.ctx.db),
    loadDailyPendingActionReminderSettings(auth.ctx.db)
  ]);

  return NextResponse.json({
    emailNotificationsEnabled,
    recipients,
    dailyPendingActionReminder
  });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const hasEmailFlag = typeof body.emailNotificationsEnabled === "boolean";
  const hasDigest = body.dailyPendingActionReminder !== undefined;

  if (!hasEmailFlag && !hasDigest) {
    return NextResponse.json(
      { error: "emailNotificationsEnabled or dailyPendingActionReminder is required" },
      { status: 400 }
    );
  }

  if (hasEmailFlag) {
    const result = await saveEmailNotificationsEnabled(
      body.emailNotificationsEnabled,
      auth.ctx.db
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Failed to save settings" }, { status: 500 });
    }
  }

  if (hasDigest) {
    const parsed = parseDailyPendingActionReminderPatch(body.dailyPendingActionReminder);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const result = await saveDailyPendingActionReminderSettings(parsed, auth.ctx.db);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Failed to save settings" }, { status: 500 });
    }
  }

  const [emailNotificationsEnabled, dailyPendingActionReminder] = await Promise.all([
    loadEmailNotificationsEnabled(auth.ctx.db),
    loadDailyPendingActionReminderSettings(auth.ctx.db)
  ]);

  return NextResponse.json({
    emailNotificationsEnabled,
    dailyPendingActionReminder
  });
}
