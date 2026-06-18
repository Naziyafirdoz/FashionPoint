import type { SupabaseClient } from "@supabase/supabase-js";
import { formatAdminCustomerName } from "@/lib/reviews/display-name";
import { buildProductReviewSummary } from "@/lib/reviews/rating-stats";

export type ReviewStatus = "pending" | "approved" | "rejected";

export type AdminReviewRow = {
  id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  user_id: string | null;
  customer_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  size_purchased: string | null;
  color_purchased: string | null;
  images: string[];
  status: ReviewStatus;
  is_verified_purchase: boolean;
  created_at: string;
};

export type AdminReviewsSummary = {
  total_reviews: number;
  pending_reviews: number;
  approved_reviews: number;
  rejected_reviews: number;
  average_rating: number;
};

type DbReviewRow = {
  id: string;
  product_id: string | null;
  user_id: string | null;
  rating: number | null;
  title: string | null;
  body: string | null;
  images: string[] | null;
  size_purchased: string | null;
  color_purchased: string | null;
  status: string | null;
  is_verified_purchase: boolean | null;
  created_at: string;
  products: { id: string; name: string; images: string[] | null } | { id: string; name: string; images: string[] | null }[] | null;
};

type DbCustomerRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

function parseProduct(
  products: DbReviewRow["products"]
): { id: string; name: string; image: string | null } {
  const product = Array.isArray(products) ? products[0] : products;
  const images = Array.isArray(product?.images) ? product.images : [];
  return {
    id: product?.id ?? "",
    name: product?.name ?? "Unknown product",
    image: images[0] ?? null
  };
}

function normalizeStatus(status: string | null | undefined): ReviewStatus {
  if (status === "approved" || status === "rejected") return status;
  return "pending";
}

export async function listAdminReviews(db: SupabaseClient): Promise<AdminReviewRow[]> {
  const { data, error } = await db
    .from("reviews")
    .select(
      `
      id,
      product_id,
      user_id,
      rating,
      title,
      body,
      images,
      size_purchased,
      color_purchased,
      status,
      is_verified_purchase,
      created_at,
      products ( id, name, images )
    `
    )
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const rows = data as DbReviewRow[];
  const userIds = [...new Set(rows.map((row) => row.user_id).filter((id): id is string => Boolean(id)))];

  const customerById = new Map<string, DbCustomerRow>();
  if (userIds.length > 0) {
    const { data: customers } = await db
      .from("customers")
      .select("id, full_name, email")
      .in("id", userIds);

    for (const customer of (customers ?? []) as DbCustomerRow[]) {
      customerById.set(customer.id, customer);
    }
  }

  return rows.map((row) => {
    const product = parseProduct(row.products);
    const customer = row.user_id ? customerById.get(row.user_id) : undefined;

    return {
      id: row.id,
      product_id: row.product_id,
      product_name: product.name,
      product_image: product.image,
      user_id: row.user_id,
      customer_name: formatAdminCustomerName(customer),
      rating: Number(row.rating ?? 0),
      title: row.title,
      body: row.body,
      size_purchased: row.size_purchased,
      color_purchased: row.color_purchased,
      images: Array.isArray(row.images) ? row.images : [],
      status: normalizeStatus(row.status),
      is_verified_purchase: Boolean(row.is_verified_purchase),
      created_at: row.created_at
    };
  });
}

export function getAdminReviewsSummary(reviews: AdminReviewRow[]): AdminReviewsSummary {
  const summary: AdminReviewsSummary = {
    total_reviews: reviews.length,
    pending_reviews: 0,
    approved_reviews: 0,
    rejected_reviews: 0,
    average_rating: 0
  };

  if (reviews.length === 0) return summary;

  const approvedRatings: number[] = [];
  for (const review of reviews) {
    if (review.status === "approved") {
      summary.approved_reviews++;
      approvedRatings.push(review.rating);
    } else if (review.status === "rejected") {
      summary.rejected_reviews++;
    } else {
      summary.pending_reviews++;
    }
  }

  summary.average_rating = buildProductReviewSummary(approvedRatings).average_rating;
  return summary;
}

export function filterAdminReviews(
  reviews: AdminReviewRow[],
  search: string,
  statusFilter: "all" | ReviewStatus,
  ratingFilter: "all" | "1" | "2" | "3" | "4" | "5",
  productFilter: string,
  customerFilter: string
): AdminReviewRow[] {
  const q = search.trim().toLowerCase();

  return reviews.filter((review) => {
    if (statusFilter !== "all" && review.status !== statusFilter) return false;
    if (ratingFilter !== "all" && review.rating !== Number(ratingFilter)) return false;
    if (productFilter !== "all" && review.product_id !== productFilter) return false;
    if (customerFilter !== "all" && review.user_id !== customerFilter) return false;

    if (!q) return true;

    const haystack = [
      review.product_name,
      review.customer_name,
      review.title ?? "",
      review.body ?? ""
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

export function isValidReviewStatus(value: unknown): value is ReviewStatus {
  return value === "pending" || value === "approved" || value === "rejected";
}
