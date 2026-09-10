import { NextResponse } from "next/server";
import { requireAdminStaff } from "@/lib/admin/require-staff";
import {
  ensureDefaultEmailTemplates,
  emailTemplatesTableReady
} from "@/lib/server/notifications/email-template-system";
import { defaultTemplateForEvent } from "@/lib/server/notifications/email-template-defaults";
import {
  EMAIL_TEMPLATE_VARIABLES,
  isEmailTemplateEventKey
} from "@/lib/settings/email-templates";

export async function GET() {
  const auth = await requireAdminStaff();
  if (!auth.ok) return auth.response;

  if (!(await emailTemplatesTableReady(auth.ctx.db))) {
    return NextResponse.json(
      {
        error:
          "Email templates table is not available. Apply the email_templates migration first.",
        templates: [],
        variables: EMAIL_TEMPLATE_VARIABLES
      },
      { status: 503 }
    );
  }

  const templates = await ensureDefaultEmailTemplates(auth.ctx.db);
  return NextResponse.json({
    templates,
    variables: EMAIL_TEMPLATE_VARIABLES
  });
}

export async function PATCH(req: Request) {
  const auth = await requireAdminStaff();
  if (!auth.ok) return auth.response;

  if (!(await emailTemplatesTableReady(auth.ctx.db))) {
    return NextResponse.json(
      {
        error:
          "Email templates table is not available. Apply the email_templates migration first."
      },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const eventKey = body.event_key;
  if (!isEmailTemplateEventKey(eventKey)) {
    return NextResponse.json({ error: "Invalid email template event" }, { status: 400 });
  }

  if (body.reset_to_default === true) {
    const def = defaultTemplateForEvent(eventKey);
    const { data, error } = await auth.ctx.db
      .from("email_templates")
      .upsert(
        {
          event_key: eventKey,
          name: def.name,
          subject: def.subject,
          body_html: def.body_html,
          is_active: true,
          updated_at: new Date().toISOString()
        },
        { onConflict: "event_key" }
      )
      .select("id, event_key, name, subject, body_html, is_active, updated_at")
      .maybeSingle();

    if (error || !data) {
      console.error("[email-templates] reset failed", error?.message);
      return NextResponse.json(
        { error: error?.message || "Unable to reset template" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, template: data });
  }

  const subject =
    typeof body.subject === "string" ? body.subject.trim() : "";
  const bodyHtml =
    typeof body.body_html === "string" ? body.body_html.trim() : "";
  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim()
      : undefined;
  const isActive =
    typeof body.is_active === "boolean" ? body.is_active : true;

  if (!subject) {
    return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  }
  if (!bodyHtml) {
    return NextResponse.json({ error: "Email body is required" }, { status: 400 });
  }

  const { data: existing } = await auth.ctx.db
    .from("email_templates")
    .select("id, name")
    .eq("event_key", eventKey)
    .maybeSingle();

  const payload = {
    event_key: eventKey,
    name: name ?? existing?.name ?? eventKey,
    subject,
    body_html: bodyHtml,
    is_active: isActive,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await auth.ctx.db
    .from("email_templates")
    .upsert(payload, { onConflict: "event_key" })
    .select("id, event_key, name, subject, body_html, is_active, updated_at")
    .maybeSingle();

  if (error || !data) {
    console.error("[email-templates] update failed", error?.message);
    return NextResponse.json(
      { error: error?.message || "Unable to save template" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, template: data });
}
