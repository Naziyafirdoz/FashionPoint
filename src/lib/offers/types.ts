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
  endsAt: Date | null;
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

/** Display-only summary attached to storefront products. Never persisted to catalog rows. */
export type ProductOfferPricing = {
  basePrice: number;
  effectivePrice: number;
  discountPerUnit: number;
  appliedOffer: AppliedOffer | null;
};

export type OfferLineInput = {
  productId: string;
  categoryId: string | null;
  catalogUnitPrice: number;
  quantity: number;
};

export type OfferPricedLine = {
  productId: string;
  categoryId: string | null;
  quantity: number;
  catalogUnitPrice: number;
  discountPerUnit: number;
  effectiveUnitPrice: number;
  lineDiscount: number;
  lineTotal: number;
  appliedOffer: AppliedOffer | null;
};

export type OfferCartPricing = {
  lines: OfferPricedLine[];
  subtotalBeforeOffers: number;
  totalOfferDiscount: number;
  subtotalAfterOffers: number;
};
