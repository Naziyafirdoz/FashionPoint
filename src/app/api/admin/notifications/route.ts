import { NextResponse } from "next/server";
import { requireAdminStaff } from "@/lib/admin/require-staff";
import { mapDbNotificationToAdmin } from "@/lib/notifications/map-db-notification";
import type { DbNotification } from "@/lib/notifications/types";

export async function GET() {
  const auth = await requireAdminStaff();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.ctx.db
    .from("notifications")
    .select("*")
    .eq("recipient", "admin")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: "Unable to load notifications" }, { status: 500 });
  }

  const notifications = (data as DbNotification[]).map(mapDbNotificationToAdmin);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(req: Request) {
  const auth = await requireAdminStaff();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const markAll = body.mark_all_read === true;
  const id = typeof body.id === "string" ? body.id : "";

  if (markAll) {
    await auth.ctx.db
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient", "admin")
      .eq("is_read", false);
    return NextResponse.json({ success: true });
  }

  if (!id) {
    return NextResponse.json({ error: "id or mark_all_read required" }, { status: 400 });
  }

  const { data, error } = await auth.ctx.db
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Unable to update notification" }, { status: 500 });
  }

  return NextResponse.json({ notification: mapDbNotificationToAdmin(data as DbNotification) });
}
