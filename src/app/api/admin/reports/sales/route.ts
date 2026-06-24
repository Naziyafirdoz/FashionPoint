import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { buildSalesReportResponse, parseReportRequest } from "@/lib/admin/reports-server";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const request = parseReportRequest(new URL(req.url).searchParams);
  const result = await buildSalesReportResponse(auth.ctx.db, request);

  if (result.status !== 200) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
