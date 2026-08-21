import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { runDailyPendingActionDigest } from "@/lib/server/notifications/daily-pending-digest";

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

  const body = await req.json().catch(() => ({}));
  const skipTimeWindow = body?.skipTimeWindow === true;

  console.info("[cron/daily-pending-digest] started", { skipTimeWindow });
  const result = await runDailyPendingActionDigest(db, { skipTimeWindow });
  console.info("[cron/daily-pending-digest] finished", result);

  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result);
}
