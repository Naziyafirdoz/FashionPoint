import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { isReturnTableError } from "@/lib/orders/returns";
import type { ReturnRequest } from "@/types";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.ctx.db
    .from("return_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    if (isReturnTableError(error)) {
      return NextResponse.json({ return_requests: [], return_tracking_available: false });
    }
    return NextResponse.json({ error: "Unable to load return requests" }, { status: 500 });
  }

  return NextResponse.json({
    return_requests: (data ?? []) as ReturnRequest[],
    return_tracking_available: true
  });
}
