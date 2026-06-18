import { NextResponse } from "next/server";
import { requireAdminStaff } from "@/lib/admin/require-staff";
import type { NotificationLogRow } from "@/lib/notifications/types";

export async function GET(req: Request) {
  const auth = await requireAdminStaff();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const channel = url.searchParams.get("channel");
  const limit = Math.min(200, Number(url.searchParams.get("limit") ?? 100));

  let query = auth.ctx.db
    .from("notification_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (channel) query = query.eq("channel", channel);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Unable to load notification logs" }, { status: 500 });
  }

  return NextResponse.json({ logs: (data as NotificationLogRow[]) ?? [] });
}
