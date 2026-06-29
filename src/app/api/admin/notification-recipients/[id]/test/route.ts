import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { sendNotificationTestEmail } from "@/lib/server/notifications/send-test-notification-email";
import { isValidRecipientEmail } from "@/lib/settings/notification-recipients";
import {
  getNotificationRecipientById,
  loadEmailNotificationsEnabled
} from "@/lib/settings/notification-recipients-store";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const emailNotificationsEnabled = await loadEmailNotificationsEnabled(auth.ctx.db);
  if (!emailNotificationsEnabled) {
    return NextResponse.json(
      { error: "Email notifications are currently disabled." },
      { status: 409 }
    );
  }

  const recipient = await getNotificationRecipientById(id, auth.ctx.db);
  if (!recipient) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }

  if (!recipient.enabled) {
    return NextResponse.json({ error: "This recipient is disabled." }, { status: 400 });
  }

  if (!isValidRecipientEmail(recipient.email)) {
    return NextResponse.json({ error: "Invalid recipient email address" }, { status: 400 });
  }

  const result = await sendNotificationTestEmail(auth.ctx.db, recipient);
  if (!result.ok) {
    return NextResponse.json({ error: "Unable to send test email." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
