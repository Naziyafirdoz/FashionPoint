import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import {
  listNotificationRecipients,
  loadDeliveryAssignedEmailEnabled,
  loadEmailNotificationsEnabled,
  saveDeliveryAssignedEmailEnabled,
  saveEmailNotificationsEnabled
} from "@/lib/settings/notification-recipients-store";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const [emailNotificationsEnabled, deliveryAssignedEmailEnabled, recipients] =
    await Promise.all([
      loadEmailNotificationsEnabled(auth.ctx.db),
      loadDeliveryAssignedEmailEnabled(auth.ctx.db),
      listNotificationRecipients(auth.ctx.db)
    ]);

  return NextResponse.json({
    emailNotificationsEnabled,
    deliveryAssignedEmailEnabled,
    recipients
  });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const hasGlobal = typeof body.emailNotificationsEnabled === "boolean";
  const hasDeliveryAssigned = typeof body.deliveryAssignedEmailEnabled === "boolean";

  if (!hasGlobal && !hasDeliveryAssigned) {
    return NextResponse.json(
      {
        error:
          "Provide emailNotificationsEnabled and/or deliveryAssignedEmailEnabled as boolean"
      },
      { status: 400 }
    );
  }

  if (hasGlobal) {
    const result = await saveEmailNotificationsEnabled(
      body.emailNotificationsEnabled,
      auth.ctx.db
    );
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Failed to save settings" },
        { status: 500 }
      );
    }
  }

  if (hasDeliveryAssigned) {
    const result = await saveDeliveryAssignedEmailEnabled(
      body.deliveryAssignedEmailEnabled,
      auth.ctx.db
    );
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Failed to save settings" },
        { status: 500 }
      );
    }
  }

  const [emailNotificationsEnabled, deliveryAssignedEmailEnabled] = await Promise.all([
    loadEmailNotificationsEnabled(auth.ctx.db),
    loadDeliveryAssignedEmailEnabled(auth.ctx.db)
  ]);

  return NextResponse.json({
    emailNotificationsEnabled,
    deliveryAssignedEmailEnabled
  });
}
