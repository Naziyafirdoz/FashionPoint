import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import {
  normalizeNotificationRecipientInput,
  normalizeRecipientEmail,
  validateNotificationRecipientInput
} from "@/lib/settings/notification-recipients";
import {
  deleteNotificationRecipient,
  listNotificationRecipients,
  updateNotificationRecipient
} from "@/lib/settings/notification-recipients-store";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const existing = await listNotificationRecipients(auth.ctx.db);
  const recipient = existing.find((row) => row.id === id);

  if (!recipient) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }

  const existingEmails = existing
    .filter((row) => row.id !== id)
    .map((row) => row.email);

  const validationError = validateNotificationRecipientInput(body, { existingEmails });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const input = normalizeNotificationRecipientInput(body);
  if (!input) {
    return NextResponse.json({ error: "Invalid recipient payload" }, { status: 400 });
  }

  if (
    existing.some(
      (row) =>
        row.id !== id && normalizeRecipientEmail(row.email) === normalizeRecipientEmail(input.email)
    )
  ) {
    return NextResponse.json({ error: "A recipient with this email already exists" }, { status: 400 });
  }

  const result = await updateNotificationRecipient(id, input, auth.ctx.db);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.conflict ? 409 : 400 }
    );
  }

  return NextResponse.json({ recipient: result.recipient });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const result = await deleteNotificationRecipient(id, auth.ctx.db);

  if (!result.ok) {
    if (result.conflict) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    const status = result.error === "Recipient not found" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ success: true });
}
