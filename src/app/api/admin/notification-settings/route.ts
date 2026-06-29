import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import {
  listNotificationRecipients,
  loadEmailNotificationsEnabled,
  saveEmailNotificationsEnabled
} from "@/lib/settings/notification-recipients-store";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const [emailNotificationsEnabled, recipients] = await Promise.all([
    loadEmailNotificationsEnabled(auth.ctx.db),
    listNotificationRecipients(auth.ctx.db)
  ]);

  return NextResponse.json({ emailNotificationsEnabled, recipients });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  if (typeof body.emailNotificationsEnabled !== "boolean") {
    return NextResponse.json(
      { error: "emailNotificationsEnabled must be a boolean" },
      { status: 400 }
    );
  }

  const result = await saveEmailNotificationsEnabled(body.emailNotificationsEnabled, auth.ctx.db);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Failed to save settings" }, { status: 500 });
  }

  return NextResponse.json({
    emailNotificationsEnabled: body.emailNotificationsEnabled
  });
}
