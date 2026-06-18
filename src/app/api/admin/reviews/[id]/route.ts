import { NextResponse } from "next/server";
import { isValidReviewStatus } from "@/lib/admin/reviews";
import { requireAdmin } from "@/lib/admin/require-admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();

  if (!isValidReviewStatus(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data, error } = await auth.ctx.db
    .from("reviews")
    .update({ status: body.status })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  return NextResponse.json({ review: data });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const { error } = await auth.ctx.db.from("reviews").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
