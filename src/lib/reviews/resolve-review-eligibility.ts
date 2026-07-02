import { normalizeOrderItems } from "@/lib/orders/order-items";
import type { UserReviewPreview } from "@/lib/reviews/types";
import type { Order } from "@/types";

export type ReviewEligibility =
  | { kind: "loading" }
  | { kind: "not_logged_in" }
  | { kind: "already_reviewed" }
  | { kind: "not_purchased" }
  | { kind: "pending_delivery" }
  | {
      kind: "can_write";
      orderId: string;
      sizePurchased: string;
      colorPurchased: string;
    };

export function resolveReviewEligibility(params: {
  isLoggedIn: boolean;
  authResolved: boolean;
  userReviews: UserReviewPreview[];
  productId: string;
  orders: Order[] | null;
  ordersLoaded: boolean;
}): ReviewEligibility {
  const { isLoggedIn, authResolved, userReviews, productId, orders, ordersLoaded } = params;

  if (!authResolved) return { kind: "loading" };
  if (!isLoggedIn) return { kind: "not_logged_in" };
  if (!ordersLoaded) return { kind: "loading" };

  let hasPurchase = false;
  let hasDeliveredPurchase = false;

  for (const order of orders ?? []) {
    const items = normalizeOrderItems(order.items);
    const item = items.find((entry) => entry.productId === productId);
    if (!item) continue;

    hasPurchase = true;

    if (order.status !== "delivered") continue;

    hasDeliveredPurchase = true;

    const alreadyReviewed = userReviews.some(
      (review) => review.product_id === productId && review.order_id === order.id
    );
    if (alreadyReviewed) continue;

    return {
      kind: "can_write",
      orderId: order.id,
      sizePurchased: item.size,
      colorPurchased: item.color
    };
  }

  if (hasDeliveredPurchase) return { kind: "already_reviewed" };
  if (hasPurchase) return { kind: "pending_delivery" };
  return { kind: "not_purchased" };
}

export function reviewEligibilityMessage(eligibility: ReviewEligibility): string | null {
  switch (eligibility.kind) {
    case "not_logged_in":
      return "Sign in to view your purchase eligibility.";
    case "already_reviewed":
      return "You have already reviewed this product.";
    case "pending_delivery":
      return "You can write a review after your order has been delivered.";
    case "not_purchased":
      return "Only customers who have purchased this product can submit a review.";
    default:
      return null;
  }
}
