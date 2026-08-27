export type OfferDiscountType = "percentage" | "fixed_amount";

export type OfferScope = "product" | "category";

export type OfferCandidate = {
  id: string;
  name: string;
  discountType: OfferDiscountType;
  discountValue: number;
  scope: OfferScope;
  isEnabled: boolean;
  startsAt: Date;
  endsAt: Date;
  productIds: string[];
  categoryIds: string[];
};

export type AppliedOffer = {
  id: string;
  name: string;
  discountType: OfferDiscountType;
  discountValue: number;
  scope: OfferScope;
};

export type OfferEvaluationInput = {
  productId: string;
  categoryId: string | null;
  catalogUnitPrice: number;
  now?: Date;
  offers: OfferCandidate[];
};

export type OfferEvaluationResult = {
  basePrice: number;
  effectivePrice: number;
  discountPerUnit: number;
  appliedOffer: AppliedOffer | null;
};
