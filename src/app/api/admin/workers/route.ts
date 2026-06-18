import { NextResponse } from "next/server";
import { requireAdminStaff } from "@/lib/admin/require-staff";

export async function GET() {
  const auth = await requireAdminStaff();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.ctx.db
    .from("admin_users")
    .select("user_id, role")
    .eq("role", "worker");

  if (error) {
    return NextResponse.json({ error: "Unable to load workers" }, { status: 500 });
  }

  return NextResponse.json({ workers: data ?? [] });
}
