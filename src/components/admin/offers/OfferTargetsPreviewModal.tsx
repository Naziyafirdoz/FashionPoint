"use client";

import {
  CatalogTargetsPreviewModal,
  type CatalogTargetPreviewInput
} from "@/components/admin/targeting/CatalogTargetsPreviewModal";

type OfferTargetsPreviewModalProps = {
  open: boolean;
  offer: CatalogTargetPreviewInput | null;
  onClose: () => void;
};

export function OfferTargetsPreviewModal({ open, offer, onClose }: OfferTargetsPreviewModalProps) {
  return (
    <CatalogTargetsPreviewModal
      open={open}
      target={offer}
      onClose={onClose}
      entityNoun="offer"
    />
  );
}
