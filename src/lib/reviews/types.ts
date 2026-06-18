import type { ReviewStatus } from "@/types";

export type StoreReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  images: string[];
  size_purchased: string | null;
  color_purchased: string | null;
  is_verified_purchase: boolean;
  created_at: string;
  customer_name: string;
};

export type ProductReviewSummary = {
  average_rating: number;
  review_count: number;
};

export type RatingBreakdown = {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
};

export type ReviewSortOption = "newest" | "oldest" | "highest" | "lowest";

export type UserReviewPreview = {
  id: string;
  product_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  images: string[];
  size_purchased: string | null;
  color_purchased: string | null;
  status: ReviewStatus;
  is_verified_purchase: boolean;
  created_at: string;
  order_id: string | null;
};

export type CreateReviewInput = {
  product_id: string;
  order_id?: string | null;
  rating: number;
  title: string;
  body: string;
  images?: string[];
  size_purchased?: string | null;
  color_purchased?: string | null;
};

export type UpdateReviewInput = {
  rating: number;
  title: string;
  body: string;
  images?: string[];
  size_purchased?: string | null;
  color_purchased?: string | null;
};

export type VerifiedPurchaseMatch = {
  order_id: string;
  size_purchased: string;
  color_purchased: string;
};
