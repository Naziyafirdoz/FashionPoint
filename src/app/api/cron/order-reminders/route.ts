import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { processDueOrderReminders } from "@/lib/server/notifications/order-reminders";

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

  const processed = await processDueOrderReminders(db);
  console.info("[cron/order-reminders] finished", { processed });
  return NextResponse.json({ success: true, processed });
}
