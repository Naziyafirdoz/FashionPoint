import { NextResponse } from "next/server";
import { ensureCustomerRecord } from "@/lib/auth/helpers";
import { requireRequestUser } from "@/lib/auth/request-user";

export async function POST(req: Request) {
  const auth = await requireRequestUser(req);
  if (!auth.ok) return auth.response;
  const { user } = auth;

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
