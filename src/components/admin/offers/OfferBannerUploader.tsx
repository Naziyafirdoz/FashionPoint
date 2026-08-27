"use client";

import { HomepageBannerUploader } from "@/components/admin/HomepageBannerUploader";

type OfferBannerUploaderProps = {
  imageUrl: string;
  onChange: (url: string) => void;
  disabled?: boolean;
};

export function OfferBannerUploader({ imageUrl, onChange, disabled }: OfferBannerUploaderProps) {
  return (
    <HomepageBannerUploader
      imageUrl={imageUrl}
      onChange={onChange}
      disabled={disabled}
      emptyStateTitle="Offer Banner"
      removeDialogTitle="Remove Offer Banner?"
      removeDialogDescription="This only removes the banner from this offer."
      previewAlt="Uploaded offer banner thumbnail"
      previewAspectClass="aspect-[16/9]"
      recommendedSize="1600 × 900"
      aspectRatioLabel="16:9 Aspect Ratio"
    />
  );
}
