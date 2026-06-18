import { NextResponse } from "next/server";
import { ensureCustomerRecord } from "@/lib/auth/helpers";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : "";
  const email = typeof body.email === "string" ? body.email : "";
  const fullName = typeof body.fullName === "string" ? body.fullName : undefined;
  const phone = typeof body.phone === "string" ? body.phone : undefined;

  if (!userId || !email) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await ensureCustomerRecord({ userId, email, fullName, phone });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, created: result.created });
}
