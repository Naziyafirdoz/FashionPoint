import type { ReviewSortOption, StoreReview } from "@/lib/reviews/types";

export function sortStoreReviews(reviews: StoreReview[], sort: ReviewSortOption): StoreReview[] {
  const next = [...reviews];

  switch (sort) {
    case "oldest":
      return next.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    case "highest":
      return next.sort((a, b) => b.rating - a.rating || b.created_at.localeCompare(a.created_at));
    case "lowest":
      return next.sort((a, b) => a.rating - b.rating || b.created_at.localeCompare(a.created_at));
    case "newest":
    default:
      return next.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }
}
