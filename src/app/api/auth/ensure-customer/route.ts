import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureCustomerRecord } from "@/lib/auth/helpers";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const fullName =
    typeof body.fullName === "string" ? body.fullName : undefined;
  const phone = typeof body.phone === "string" ? body.phone : undefined;

  const result = await ensureCustomerRecord({
    userId: user.id,
    email: user.email ?? "",
    fullName,
    phone
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, created: result.created });
}
