"use client";

import { useMemo, useState } from "react";
import { ReviewFormModal } from "@/components/reviews/ReviewFormModal";
import { hasCustomerReviewForLine } from "@/lib/reviews/order-review-status";
import type { UserReviewPreview } from "@/lib/reviews/types";

type OrderReviewButtonProps = {
  productId: string;
  productName: string;
  orderId: string;
  size: string;
  color: string;
  userReviews: UserReviewPreview[];
  onReviewChange?: () => void | Promise<void>;
  compact?: boolean;
};

export function OrderReviewButton({
  productId,
  productName,
  orderId,
  size,
  color,
  userReviews,
  onReviewChange,
  compact = false
}: OrderReviewButtonProps) {
  const [open, setOpen] = useState(false);

  const reviewForLine = useMemo(
    () => hasCustomerReviewForLine(userReviews, orderId, productId),
    [userReviews, orderId, productId]
  );

  const handleReviewSuccess = async () => {
    await onReviewChange?.();
  };

  const handleDuplicateReview = async () => {
    console.info("[review-submit] refreshing review state");
    await onReviewChange?.();
  };

  if (reviewForLine) {
    return (
      <span
        className={
          compact
            ? "inline-flex shrink-0 items-center self-center rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700"
            : "inline-flex shrink-0 items-center self-center rounded-full border border-green-200 bg-green-100 px-4 py-2 text-sm font-medium text-green-700"
        }
      >
        Review Submitted
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? "inline-flex h-9 shrink-0 items-center self-center rounded-lg border border-[#7B0D2B] bg-white px-3 text-xs font-medium text-[#7B0D2B] hover:bg-[#7B0D2B]/5"
            : "btn-primary shrink-0 self-center"
        }
      >
        Write Review
      </button>
      <ReviewFormModal
        key={`${orderId}:${productId}`}
        open={open}
        onClose={() => setOpen(false)}
        defaults={{
          productId,
          productName,
          orderId,
          sizePurchased: size,
          colorPurchased: color
        }}
        onSuccess={handleReviewSuccess}
        onDuplicateReview={handleDuplicateReview}
      />
    </>
  );
}
