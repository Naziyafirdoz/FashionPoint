"use client";

import { useMemo, useState } from "react";
import { ReviewFormModal } from "@/components/reviews/ReviewFormModal";
import type { UserReviewPreview } from "@/lib/reviews/types";

type OrderReviewButtonProps = {
  productId: string;
  productName: string;
  orderId: string;
  size: string;
  color: string;
  userReview?: UserReviewPreview | null;
  onReviewChange?: () => void;
};

export function OrderReviewButton({
  productId,
  productName,
  orderId,
  size,
  color,
  userReview,
  onReviewChange
}: OrderReviewButtonProps) {
  const [open, setOpen] = useState(false);

  const reviewForProduct = useMemo(() => {
    if (!userReview || userReview.product_id !== productId) return null;
    return userReview;
  }, [userReview, productId]);

  if (reviewForProduct) {
    return (
      <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
        Review Submitted
      </span>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primary shrink-0">
        Write Review
      </button>
      <ReviewFormModal
        open={open}
        onClose={() => setOpen(false)}
        defaults={{
          productId,
          productName,
          orderId,
          sizePurchased: size,
          colorPurchased: color
        }}
        onSuccess={() => onReviewChange?.()}
      />
    </>
  );
}
