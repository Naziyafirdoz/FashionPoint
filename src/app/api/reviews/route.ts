import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCustomer } from "@/lib/reviews/auth";
import {
  createCustomerReview,
  getProductRatingBreakdown,
  getProductReviewSummariesBatch,
  getProductReviewSummary,
  getUserReviewForProduct,
  listApprovedProductReviews,
  listUserReviews,
  listUserReviewsForProducts
} from "@/lib/reviews/service";
import type { CreateReviewInput } from "@/lib/reviews/types";

let reviewsApiRequestCount = 0;

export async function GET(req: Request) {
  reviewsApiRequestCount += 1;
  const start = performance.now();
  console.log("API REVIEWS CALLED", { count: reviewsApiRequestCount });
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("product_id")?.trim();
  const productIdsParam = searchParams.get("product_ids")?.trim();
  const mine = searchParams.get("mine") === "true";

  const db = createAdminClient();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  if (mine) {
    const auth = await requireCustomer();
    if (!auth.ok) return auth.response;

    const productIds = productIdsParam
      ? productIdsParam
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      : [];

    const reviews =
      productIds.length > 0
        ? await listUserReviewsForProducts(auth.ctx.db, auth.ctx.userId, productIds)
        : await listUserReviews(auth.ctx.db, auth.ctx.userId);
    console.log("[reviews] elapsed", performance.now() - start, {
      count: reviewsApiRequestCount,
      mine: true,
      productIds: productIds.length
    });
    return NextResponse.json({ reviews });
  }

  if (productIdsParam) {
    const productIds = productIdsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    const summaries = await getProductReviewSummariesBatch(db, productIds);
    console.log("[reviews] elapsed", performance.now() - start, {
      count: reviewsApiRequestCount,
      productIds: productIds.length
    });
    return NextResponse.json({ summaries });
  }

  if (!productId) {
    console.log("[reviews] elapsed", performance.now() - start, { count: reviewsApiRequestCount, error: true });
    return NextResponse.json({ error: "product_id is required" }, { status: 400 });
  }

  const reviews = await listApprovedProductReviews(db, productId);
  const summary = getProductReviewSummary(reviews);
  const breakdown = getProductRatingBreakdown(reviews);

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  let user_review = null;
  if (user) {
    user_review = await getUserReviewForProduct(db, user.id, productId);
  }

  console.log("[reviews] elapsed", performance.now() - start, { count: reviewsApiRequestCount, productId });
  return NextResponse.json({ reviews, summary, breakdown, user_review });
}

export async function POST(req: Request) {
  const auth = await requireCustomer();
  if (!auth.ok) return auth.response;

  const body = (await req.json()) as Partial<CreateReviewInput>;

  const input: CreateReviewInput = {
    product_id: String(body.product_id ?? ""),
    order_id: body.order_id ? String(body.order_id) : null,
    rating: Number(body.rating),
    title: String(body.title ?? ""),
    body: String(body.body ?? ""),
    images: Array.isArray(body.images) ? body.images.map(String) : [],
    size_purchased: body.size_purchased ? String(body.size_purchased) : null,
    color_purchased: body.color_purchased ? String(body.color_purchased) : null
  };

  const result = await createCustomerReview(auth.ctx.db, auth.ctx.userId, input);

  if ("error" in result && result.error) {
    const status = result.error.includes("already reviewed") ? 409 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result, { status: 201 });
}
