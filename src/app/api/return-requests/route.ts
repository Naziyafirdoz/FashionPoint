import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth/request-user";
import { createServiceClient } from "@/lib/supabase";
import { isReturnTableError, RETURN_MIGRATION_UNAVAILABLE } from "@/lib/orders/returns";
import type { ReturnRequest } from "@/types";

export async function GET(req: Request) {
  const auth = await requireRequestUser(req);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const db = createServiceClient();
  if (!db) {
    return NextResponse.json({ return_requests: [], return_tracking_available: false });
  }

  const { data, error } = await db
    .from("return_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    if (isReturnTableError(error)) {
      return NextResponse.json({
        return_requests: [],
        return_tracking_available: false,
        message: RETURN_MIGRATION_UNAVAILABLE
      });
    }
    return NextResponse.json({ error: "Unable to load return requests" }, { status: 500 });
  }

  return NextResponse.json({
    return_requests: (data ?? []) as ReturnRequest[],
    return_tracking_available: true
  });
}
