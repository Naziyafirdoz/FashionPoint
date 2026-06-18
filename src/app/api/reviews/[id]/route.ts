import { NextResponse } from "next/server";
import { requireCustomer } from "@/lib/reviews/auth";
import { updateCustomerReview } from "@/lib/reviews/service";
import type { UpdateReviewInput } from "@/lib/reviews/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteContext) {
  const auth = await requireCustomer();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = (await req.json()) as Partial<UpdateReviewInput>;

  const input: UpdateReviewInput = {
    rating: Number(body.rating),
    title: String(body.title ?? ""),
    body: String(body.body ?? ""),
    images: Array.isArray(body.images) ? body.images.map(String) : [],
    size_purchased: body.size_purchased ? String(body.size_purchased) : null,
    color_purchased: body.color_purchased ? String(body.color_purchased) : null
  };

  const result = await updateCustomerReview(auth.ctx.db, auth.ctx.userId, id, input);

  if ("error" in result && result.error) {
    const status = result.error === "Review not found" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result);
}
