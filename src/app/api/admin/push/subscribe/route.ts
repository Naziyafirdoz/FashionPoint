import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { data: admin } = await db
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const fcmToken = typeof body.fcm_token === "string" ? body.fcm_token.trim() : "";
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  const p256dh = typeof body.p256dh === "string" ? body.p256dh : "";
  const authKey = typeof body.auth === "string" ? body.auth : "";

  if (fcmToken) {
    const { error } = await db.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        fcm_token: fcmToken,
        endpoint: endpoint || `fcm:${fcmToken.slice(0, 32)}`,
        p256dh: p256dh || "fcm",
        auth: authKey || "fcm"
      },
      { onConflict: "user_id,endpoint" }
    );

    if (error) {
      return NextResponse.json({ error: "Unable to save FCM token" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const { error } = await db.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth: authKey
    },
    { onConflict: "user_id,endpoint" }
  );

  if (error) {
    return NextResponse.json({ error: "Unable to save subscription" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
