import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import {
  normalizeNotificationRecipientInput,
  normalizeRecipientEmail,
  validateNotificationRecipientInput
} from "@/lib/settings/notification-recipients";
import {
  createNotificationRecipient,
  listNotificationRecipients
} from "@/lib/settings/notification-recipients-store";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const recipients = await listNotificationRecipients(auth.ctx.db);
  return NextResponse.json({ recipients });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const existing = await listNotificationRecipients(auth.ctx.db);
  const existingEmails = existing.map((recipient) => recipient.email);

  const validationError = validateNotificationRecipientInput(body, { existingEmails });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const input = normalizeNotificationRecipientInput(body);
  if (!input) {
    return NextResponse.json({ error: "Invalid recipient payload" }, { status: 400 });
  }

  if (
    existing.some((recipient) => normalizeRecipientEmail(recipient.email) === input.email)
  ) {
    return NextResponse.json({ error: "A recipient with this email already exists" }, { status: 400 });
  }

  const result = await createNotificationRecipient(input, auth.ctx.db);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ recipient: result.recipient }, { status: 201 });
}
