import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeOrderItems } from "@/lib/orders/order-items";
import { formatCustomerDisplayName } from "@/lib/reviews/display-name";
import {
  aggregateReviewSummaries,
  buildProductReviewSummary,
  buildRatingBreakdown
} from "@/lib/reviews/rating-stats";
import type {
  CreateReviewInput,
  ProductReviewSummary,
  RatingBreakdown,
  StoreReview,
  UpdateReviewInput,
  UserReviewPreview,
  VerifiedPurchaseMatch
} from "@/lib/reviews/types";
import type { ReviewStatus } from "@/types";

type DbReviewRow = {
  id: string;
  product_id: string | null;
  user_id: string | null;
  order_id: string | null;
  rating: number | null;
  title: string | null;
  body: string | null;
  images: string[] | null;
  size_purchased: string | null;
  color_purchased: string | null;
  status: string | null;
  is_verified_purchase: boolean | null;
  created_at: string;
};

type DbCustomerRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

function normalizeStatus(status: string | null | undefined): ReviewStatus {
  if (status === "approved" || status === "rejected") return status;
  return "pending";
}

async function loadCustomerNames(
  db: SupabaseClient,
  userIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (userIds.length === 0) return map;

  const { data } = await db.from("customers").select("id, full_name, email").in("id", userIds);

  for (const customer of (data ?? []) as DbCustomerRow[]) {
    map.set(customer.id, formatCustomerDisplayName(customer));
  }

  return map;
}

function mapStoreReview(row: DbReviewRow, customerName: string): StoreReview {
  return {
    id: row.id,
    rating: Number(row.rating ?? 0),
    title: row.title,
    body: row.body,
    images: Array.isArray(row.images) ? row.images : [],
    size_purchased: row.size_purchased,
    color_purchased: row.color_purchased,
    is_verified_purchase: Boolean(row.is_verified_purchase),
    created_at: row.created_at,
    customer_name: customerName
  };
}

function mapUserReview(row: DbReviewRow): UserReviewPreview {
  return {
    id: row.id,
    product_id: row.product_id ?? "",
    rating: Number(row.rating ?? 0),
    title: row.title,
    body: row.body,
    images: Array.isArray(row.images) ? row.images : [],
    size_purchased: row.size_purchased,
    color_purchased: row.color_purchased,
    status: normalizeStatus(row.status),
    is_verified_purchase: Boolean(row.is_verified_purchase),
    created_at: row.created_at,
    order_id: row.order_id
  };
}

export function getProductReviewSummary(reviews: StoreReview[]): ProductReviewSummary {
  return buildProductReviewSummary(reviews.map((review) => review.rating));
}

export function getProductRatingBreakdown(reviews: StoreReview[]): RatingBreakdown {
  return buildRatingBreakdown(reviews.map((review) => review.rating));
}

export async function getProductReviewSummariesBatch(
  db: SupabaseClient,
  productIds: string[]
): Promise<Record<string, ProductReviewSummary>> {
  const uniqueIds = [...new Set(productIds.filter(Boolean))];
  if (uniqueIds.length === 0) return {};

  const { data, error } = await db
    .from("reviews")
    .select("product_id, rating")
    .eq("status", "approved")
    .in("product_id", uniqueIds);

  if (error || !data) return {};

  return aggregateReviewSummaries(
    data as Array<{ product_id: string | null; rating: number | null }>
  );
}

export async function listApprovedProductReviews(
  db: SupabaseClient,
  productId: string
): Promise<StoreReview[]> {
  const { data, error } = await db
    .from("reviews")
    .select(
      "id, product_id, user_id, rating, title, body, images, size_purchased, color_purchased, is_verified_purchase, created_at"
    )
    .eq("product_id", productId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const rows = data as DbReviewRow[];
  const userIds = [...new Set(rows.map((row) => row.user_id).filter((id): id is string => Boolean(id)))];
  const customerNames = await loadCustomerNames(db, userIds);

  return rows.map((row) =>
    mapStoreReview(
      row,
      row.user_id ? customerNames.get(row.user_id) ?? "Guest Review" : "Guest Review"
    )
  );
}

export async function getUserReviewForProduct(
  db: SupabaseClient,
  userId: string,
  productId: string
): Promise<UserReviewPreview | null> {
  const reviews = await listUserReviewsForProducts(db, userId, [productId]);
  return reviews[0] ?? null;
}

export async function getUserReviewForOrder(
  db: SupabaseClient,
  userId: string,
  productId: string,
  orderId: string
): Promise<UserReviewPreview | null> {
  const { data } = await db
    .from("reviews")
    .select(
      "id, product_id, user_id, order_id, rating, title, body, images, size_purchased, color_purchased, status, is_verified_purchase, created_at"
    )
    .eq("user_id", userId)
    .eq("product_id", productId)
    .eq("order_id", orderId)
    .maybeSingle();

  if (!data) return null;
  return mapUserReview(data as DbReviewRow);
}

export async function listUserReviewsForProducts(
  db: SupabaseClient,
  userId: string,
  productIds: string[]
): Promise<UserReviewPreview[]> {
  const uniqueIds = [...new Set(productIds.filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  const { data, error } = await db
    .from("reviews")
    .select(
      "id, product_id, user_id, order_id, rating, title, body, images, size_purchased, color_purchased, status, is_verified_purchase, created_at"
    )
    .eq("user_id", userId)
    .in("product_id", uniqueIds)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as DbReviewRow[]).map(mapUserReview);
}

export async function listUserReviews(db: SupabaseClient, userId: string): Promise<UserReviewPreview[]> {
  const { data, error } = await db
    .from("reviews")
    .select(
      "id, product_id, user_id, order_id, rating, title, body, images, size_purchased, color_purchased, status, is_verified_purchase, created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as DbReviewRow[]).map(mapUserReview);
}

export async function findVerifiedPurchase(
  db: SupabaseClient,
  userId: string,
  productId: string,
  orderId?: string | null
): Promise<VerifiedPurchaseMatch | null> {
  let query = db
    .from("orders")
    .select("id, items")
    .eq("user_id", userId)
    .eq("status", "delivered");

  if (orderId) {
    query = query.eq("id", orderId);
  }

  const { data: orders } = await query;

  for (const order of orders ?? []) {
    const items = normalizeOrderItems(order.items);
    const item = items.find((entry) => entry.productId === productId);
    if (item) {
      return {
        order_id: String(order.id),
        size_purchased: item.size,
        color_purchased: item.color
      };
    }
  }

  return null;
}

export function validateReviewInput(input: CreateReviewInput | UpdateReviewInput): string | null {
  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return "Rating must be between 1 and 5";
  }

  const title = input.title.trim();
  if (!title) return "Title is required";

  const body = input.body.trim();
  if (!body) return "Review text is required";

  if (title.length > 200) return "Title must be 200 characters or fewer";
  if (body.length > 5000) return "Review text must be 5000 characters or fewer";

  const images = input.images ?? [];
  if (images.length > 6) return "Maximum 6 review photos allowed";

  return null;
}

export async function createCustomerReview(
  db: SupabaseClient,
  userId: string,
  input: CreateReviewInput
) {
  const validationError = validateReviewInput(input);
  if (validationError) return { error: validationError };

  const productId = input.product_id.trim();
  if (!productId) return { error: "Product is required" };

  const orderId = input.order_id?.trim();
  if (!orderId) {
    return { error: "A delivered order is required to submit a review" };
  }

  const existing = await getUserReviewForOrder(db, userId, productId, orderId);
  if (existing) {
    return { error: "You have already reviewed this product" };
  }

  const verified = await findVerifiedPurchase(db, userId, productId, orderId);
  if (!verified) {
    return { error: "This order does not include the selected product or is not delivered" };
  }

  const payload = {
    product_id: productId,
    user_id: userId,
    order_id: verified.order_id,
    rating: Number(input.rating),
    title: input.title.trim(),
    body: input.body.trim(),
    images: input.images ?? [],
    size_purchased: input.size_purchased?.trim() || verified.size_purchased || null,
    color_purchased: input.color_purchased?.trim() || verified.color_purchased || null,
    is_verified_purchase: true
  };

  const { data, error } = await db.from("reviews").insert(payload).select().single();

  if (error) {
    if (error.code === "23505") {
      return { error: "You have already reviewed this product" };
    }
    return { error: error.message };
  }
  return { review: mapUserReview(data as DbReviewRow) };
}

export async function updateCustomerReview(
  db: SupabaseClient,
  userId: string,
  reviewId: string,
  input: UpdateReviewInput
) {
  const validationError = validateReviewInput(input);
  if (validationError) return { error: validationError };

  const { data: existing } = await db
    .from("reviews")
    .select("id, user_id, status")
    .eq("id", reviewId)
    .maybeSingle();

  if (!existing || existing.user_id !== userId) {
    return { error: "Review not found" };
  }

  const { data, error } = await db
    .from("reviews")
    .update({
      rating: Number(input.rating),
      title: input.title.trim(),
      body: input.body.trim(),
      images: input.images ?? [],
      size_purchased: input.size_purchased?.trim() || null,
      color_purchased: input.color_purchased?.trim() || null,
      status: "pending"
    })
    .eq("id", reviewId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return { error: error.message };
  return { review: mapUserReview(data as DbReviewRow) };
}
