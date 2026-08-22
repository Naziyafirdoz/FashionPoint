import { NextResponse } from "next/server";
import { ensureCustomerRecord } from "@/lib/auth/helpers";
import { getRequestAuthUser } from "@/lib/auth/request-user";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const claimedUserId = typeof body.userId === "string" ? body.userId.trim() : "";
  const claimedEmail = typeof body.email === "string" ? body.email.trim() : "";
  const fullName = typeof body.fullName === "string" ? body.fullName : undefined;
  const phone = typeof body.phone === "string" ? body.phone : undefined;

  const sessionAuth = await getRequestAuthUser(req);
  if (sessionAuth.ok) {
    const result = await ensureCustomerRecord({
      userId: sessionAuth.user.id,
      email: sessionAuth.user.email ?? claimedEmail,
      fullName,
      phone
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, created: result.created });
  }

  if (!claimedUserId || !claimedEmail) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const { data, error } = await admin.auth.admin.getUserById(claimedUserId);
  const authUser = data?.user;
  if (error || !authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authEmail = (authUser.email ?? "").trim().toLowerCase();
  if (!authEmail || authEmail !== claimedEmail.toLowerCase()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Unauthenticated calls are only for the existing email-confirmation signup path.
  if (authUser.email_confirmed_at) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await ensureCustomerRecord({
    userId: authUser.id,
    email: authUser.email ?? claimedEmail,
    fullName,
    phone
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, created: result.created });
}
