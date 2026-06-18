"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { ReviewImageUploader } from "@/components/reviews/ReviewImageUploader";
import { ReviewStarInput } from "@/components/reviews/ReviewStars";
import type { UserReviewPreview } from "@/lib/reviews/types";

export type ReviewFormDefaults = {
  productId: string;
  productName: string;
  orderId?: string | null;
  sizePurchased?: string | null;
  colorPurchased?: string | null;
};

type ReviewFormModalProps = {
  open: boolean;
  onClose: () => void;
  defaults: ReviewFormDefaults;
  existingReview?: UserReviewPreview | null;
  onSuccess: () => void;
};

export function ReviewFormModal({
  open,
  onClose,
  defaults,
  existingReview,
  onSuccess
}: ReviewFormModalProps) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [sizePurchased, setSizePurchased] = useState("");
  const [colorPurchased, setColorPurchased] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setRating(existingReview?.rating ?? 5);
    setTitle(existingReview?.title ?? "");
    setBody(existingReview?.body ?? "");
    setImages(existingReview?.images ?? []);
    setSizePurchased(existingReview?.size_purchased ?? defaults.sizePurchased ?? "");
    setColorPurchased(existingReview?.color_purchased ?? defaults.colorPurchased ?? "");
  }, [open, existingReview, defaults.sizePurchased, defaults.colorPurchased]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rating) {
      toast.error("Please select a rating");
      return;
    }
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!body.trim()) {
      toast.error("Review text is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        product_id: defaults.productId,
        order_id: defaults.orderId ?? existingReview?.order_id ?? null,
        rating,
        title: title.trim(),
        body: body.trim(),
        images,
        size_purchased: sizePurchased.trim() || null,
        color_purchased: colorPurchased.trim() || null
      };

      const url = existingReview ? `/api/reviews/${existingReview.id}` : "/api/reviews";
      const method = existingReview ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to save review");
        return;
      }

      toast.success(
        existingReview ? "Review updated and sent for moderation" : "Review submitted for moderation"
      );
      onSuccess();
      onClose();
    } catch {
      toast.error("Failed to save review");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-form-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="review-form-title" className="font-display text-xl font-bold text-primary">
              {existingReview ? "Edit Review" : "Write a Review"}
            </h2>
            <p className="mt-1 text-sm text-foreground/70">{defaults.productName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-blush/50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-semibold">Rating *</label>
            <div className="mt-2">
              <ReviewStarInput value={rating} onChange={setRating} />
            </div>
          </div>

          <div>
            <label htmlFor="review-title" className="text-sm font-semibold">
              Title *
            </label>
            <input
              id="review-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Summarize your experience"
            />
          </div>

          <div>
            <label htmlFor="review-body" className="text-sm font-semibold">
              Review *
            </label>
            <textarea
              id="review-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              maxLength={5000}
              className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Share details about fit, fabric, and quality"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="review-size" className="text-sm font-semibold">
                Purchased size
              </label>
              <input
                id="review-size"
                value={sizePurchased}
                onChange={(e) => setSizePurchased(e.target.value)}
                className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="e.g. M(36)"
              />
            </div>
            <div>
              <label htmlFor="review-color" className="text-sm font-semibold">
                Purchased color
              </label>
              <input
                id="review-color"
                value={colorPurchased}
                onChange={(e) => setColorPurchased(e.target.value)}
                className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="e.g. Maroon"
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold">Photos</p>
            <div className="mt-2">
              <ReviewImageUploader images={images} onChange={setImages} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-outline flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
              {saving ? "Saving…" : existingReview ? "Update Review" : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
