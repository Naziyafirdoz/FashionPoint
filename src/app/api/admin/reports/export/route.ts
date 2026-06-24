import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { buildExportDataset, parseReportRequest } from "@/lib/admin/reports-server";

const VALID_DATASETS = new Set(["orders", "products", "inventory", "reviews"]);

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const dataset = url.searchParams.get("dataset") ?? "";
  if (!VALID_DATASETS.has(dataset)) {
    return NextResponse.json({ error: "Invalid export dataset" }, { status: 400 });
  }

  const request = parseReportRequest(url.searchParams);
  const result = await buildExportDataset(
    auth.ctx.db,
    request,
    dataset as "orders" | "products" | "inventory" | "reviews"
  );

  if (result.status !== 200) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ...result.data,
    updatedAt: new Date().toISOString()
  });
}
