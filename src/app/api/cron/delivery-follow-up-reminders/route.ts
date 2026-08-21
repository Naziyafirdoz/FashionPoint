import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { processDeliveryFollowUpReminders } from "@/lib/server/notifications/delivery-follow-up-reminders";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const cancelled = await processDeliveryFollowUpReminders(db);
  console.info("[cron/delivery-follow-up-reminders] finished", { cancelled });
  return NextResponse.json({ success: true, cancelled });
}
