import type {
  AppliedOffer,
  OfferCandidate,
  OfferEvaluationInput,
  OfferEvaluationResult
} from "./types";

/**
 * Round rupees to paise precision, matching `amountToPaise` in checkout totals.
 */
export function roundOfferMoney(value: number): number {
  return Math.round(Number(value) * 100) / 100;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function discountPerUnitForOffer(basePrice: number, offer: OfferCandidate): number | null {
  const value = Number(offer.discountValue);
  if (!Number.isFinite(value) || value <= 0) return null;

  let raw: number;
  if (offer.discountType === "percentage") {
    if (value > 100) return null;
    raw = basePrice * (value / 100);
  } else if (offer.discountType === "fixed_amount") {
    raw = value;
  } else {
    return null;
  }

  if (!Number.isFinite(raw) || raw <= 0) return null;
  return Math.min(basePrice, roundOfferMoney(raw));
}

function isWithinSchedule(offer: OfferCandidate, now: Date): boolean {
  const startsAt = toDate(offer.startsAt);
  const endsAt = toDate(offer.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return false;
  return now.getTime() >= startsAt.getTime() && now.getTime() <= endsAt.getTime();
}

function matchesTarget(
  offer: OfferCandidate,
  productId: string,
  categoryId: string | null
): boolean {
  if (offer.scope === "product") {
    return offer.productIds.includes(productId);
  }
  if (offer.scope === "category") {
    return categoryId != null && offer.categoryIds.includes(categoryId);
  }
  return false;
}

export function isOfferEligible(
  offer: OfferCandidate,
  productId: string,
  categoryId: string | null,
  now: Date
): boolean {
  if (!offer.isEnabled) return false;
  if (!isWithinSchedule(offer, now)) return false;
  return matchesTarget(offer, productId, categoryId);
}

function toAppliedOffer(offer: OfferCandidate): AppliedOffer {
  return {
    id: offer.id,
    name: offer.name,
    discountType: offer.discountType,
    discountValue: offer.discountValue,
    scope: offer.scope
  };
}

function pickHighestRupeeDiscount(
  offers: OfferCandidate[],
  basePrice: number
): { offer: OfferCandidate; discountPerUnit: number } | null {
  let winner: { offer: OfferCandidate; discountPerUnit: number } | null = null;

  for (const offer of offers) {
    const discountPerUnit = discountPerUnitForOffer(basePrice, offer);
    if (discountPerUnit == null || discountPerUnit <= 0) continue;

    if (
      winner == null ||
      discountPerUnit > winner.discountPerUnit ||
      (discountPerUnit === winner.discountPerUnit && offer.id < winner.offer.id)
    ) {
      winner = { offer, discountPerUnit };
    }
  }

  return winner;
}

function emptyResult(basePrice: number): OfferEvaluationResult {
  const safeBase = Number.isFinite(basePrice) ? Math.max(0, roundOfferMoney(basePrice)) : 0;
  return {
    basePrice: safeBase,
    effectivePrice: safeBase,
    discountPerUnit: 0,
    appliedOffer: null
  };
}

/**
 * Pure, deterministic offer evaluation. Does not load data or touch checkout.
 * Catalog unit price is the only money input; client prices must never be passed here as truth.
 */
export function evaluateOffer(input: OfferEvaluationInput): OfferEvaluationResult {
  const now = input.now ?? new Date();
  const basePrice = roundOfferMoney(Number(input.catalogUnitPrice));
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    return emptyResult(basePrice);
  }

  const eligible = input.offers.filter((offer) =>
    isOfferEligible(offer, input.productId, input.categoryId, now)
  );

  const productOffers = eligible.filter((offer) => offer.scope === "product");
  const categoryOffers = eligible.filter((offer) => offer.scope === "category");
  const pool = productOffers.length > 0 ? productOffers : categoryOffers;
  const winner = pickHighestRupeeDiscount(pool, basePrice);

  if (!winner) {
    return emptyResult(basePrice);
  }

  const discountPerUnit = winner.discountPerUnit;
  const effectivePrice = roundOfferMoney(Math.max(0, basePrice - discountPerUnit));

  return {
    basePrice,
    effectivePrice,
    discountPerUnit,
    appliedOffer: toAppliedOffer(winner.offer)
  };
}
