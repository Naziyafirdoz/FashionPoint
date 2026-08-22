import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth/request-user";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ productId: string }> };

export async function DELETE(req: Request, { params }: RouteContext) {
  const auth = await requireRequestUser(req);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const { productId } = await params;
  if (!productId || !UUID_RE.test(productId)) {
    return NextResponse.json({ error: "Invalid product_id" }, { status: 400 });
  }

  const db = createAdminClient();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const { error } = await db
    .from("wishlist")
    .delete()
    .eq("user_id", user.id)
    .eq("product_id", productId);

  if (error) {
    return NextResponse.json({ error: "Unable to update wishlist" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
