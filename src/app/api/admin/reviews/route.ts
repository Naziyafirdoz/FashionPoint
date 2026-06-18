import { NextResponse } from "next/server";
import { getAdminReviewsSummary, listAdminReviews } from "@/lib/admin/reviews";
import { requireAdmin } from "@/lib/admin/require-admin";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const reviews = await listAdminReviews(auth.ctx.db);
  const summary = getAdminReviewsSummary(reviews);

  return NextResponse.json({ reviews, summary });
}
