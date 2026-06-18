import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/admin/dashboard";
import { requireAdmin } from "@/lib/admin/require-admin";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const data = await getDashboardData(auth.ctx.db);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}
