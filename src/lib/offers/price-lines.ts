import { evaluateOffer, roundOfferMoney } from "./evaluate";
import type {
  OfferCandidate,
  OfferCartPricing,
  OfferLineInput,
  OfferPricedLine
} from "./types";

function safeQuantity(value: number): number {
  const quantity = Math.floor(Number(value));
  if (!Number.isFinite(quantity) || quantity < 1) return 1;
  return quantity;
}

export function priceOfferLine(
  input: OfferLineInput,
  offers: OfferCandidate[],
  now?: Date
): OfferPricedLine {
  const quantity = safeQuantity(input.quantity);
  const evaluated = evaluateOffer({
    productId: input.productId,
    categoryId: input.categoryId,
    catalogUnitPrice: input.catalogUnitPrice,
    now,
    offers
  });

  const catalogUnitPrice = evaluated.basePrice;
  const discountPerUnit = evaluated.discountPerUnit;
  const effectiveUnitPrice = evaluated.effectivePrice;

  return {
    productId: input.productId,
    categoryId: input.categoryId,
    quantity,
    catalogUnitPrice,
    discountPerUnit,
    effectiveUnitPrice,
    lineDiscount: roundOfferMoney(discountPerUnit * quantity),
    lineTotal: roundOfferMoney(effectiveUnitPrice * quantity),
    appliedOffer: evaluated.appliedOffer
  };
}

export function priceOfferCart(
  lines: OfferLineInput[],
  offers: OfferCandidate[],
  now?: Date
): OfferCartPricing {
  const priced = lines.map((line) => priceOfferLine(line, offers, now));
  const subtotalBeforeOffers = roundOfferMoney(
    priced.reduce((sum, line) => sum + line.catalogUnitPrice * line.quantity, 0)
  );
  const totalOfferDiscount = roundOfferMoney(
    priced.reduce((sum, line) => sum + line.lineDiscount, 0)
  );
  const subtotalAfterOffers = roundOfferMoney(Math.max(0, subtotalBeforeOffers - totalOfferDiscount));

  return {
    lines: priced,
    subtotalBeforeOffers,
    totalOfferDiscount,
    subtotalAfterOffers
  };
}
