import type { UserReviewPreview } from "@/lib/reviews/types";

/** True only when a reviews row exists for this exact order + product (user scoped via mine=true list). */
export function findExistingUserReview(
  reviews: UserReviewPreview[],
  productId: string,
  orderId: string
): UserReviewPreview | null {
  return (
    reviews.find(
      (review) => review.product_id === productId && review.order_id === orderId
    ) ?? null
  );
}

export function hasCustomerReviewForLine(
  reviews: UserReviewPreview[],
  orderId: string,
  productId: string
): UserReviewPreview | null {
  const review = findExistingUserReview(reviews, productId, orderId);
  if (review) {
    console.info("[reviews] hasReview", {
      orderId,
      productId,
      reviewId: review.id
    });
  } else {
    console.info("[reviews] noReview", { orderId, productId });
  }
  return review;
}
