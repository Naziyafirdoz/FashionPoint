import { NextResponse } from "next/server";
import { listInventoryVariants } from "@/lib/admin/inventory";
import { requireAdmin } from "@/lib/admin/require-admin";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const rows = await listInventoryVariants(auth.ctx.db);
  return NextResponse.json({ rows });
}
