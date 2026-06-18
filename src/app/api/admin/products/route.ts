import { NextResponse } from "next/server";
import { listAdminProducts } from "@/lib/admin/products";
import { requireAdmin } from "@/lib/admin/require-admin";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const products = await listAdminProducts(auth.ctx.db);
  return NextResponse.json({ products });
}
