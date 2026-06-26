import { NextResponse } from "next/server";
import { getCachedDashboardData } from "@/lib/admin/dashboard-cache";
import { requireAdmin } from "@/lib/admin/require-admin";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const forceRefresh = new URL(req.url).searchParams.get("refresh") === "1";
    const data = await getCachedDashboardData(auth.ctx.db, forceRefresh);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}
