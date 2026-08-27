/**
 * Non-production checks for the Festival Offers evaluation engine.
 * Usage: node scripts/verify-offer-evaluation.ts
 */
import assert from "node:assert/strict";
import { evaluateOffer } from "../src/lib/offers/evaluate.ts";
import type { OfferCandidate, OfferScope } from "../src/lib/offers/types.ts";

const PRODUCT_ID = "product-1";
const CATEGORY_ID = "category-1";
const NOW = new Date("2026-08-26T12:00:00.000Z");

function offer(partial: Partial<OfferCandidate> & Pick<OfferCandidate, "id" | "name">): OfferCandidate {
  return {
    discountType: "percentage",
    discountValue: 20,
    scope: "product",
    isEnabled: true,
    startsAt: new Date("2026-08-01T00:00:00.000Z"),
    endsAt: new Date("2026-08-31T23:59:59.000Z"),
    productIds: [PRODUCT_ID],
    categoryIds: [],
    ...partial
  };
}

function evaluate(
  catalogUnitPrice: number,
  offers: OfferCandidate[],
  extras?: { productId?: string; categoryId?: string | null; now?: Date }
) {
  return evaluateOffer({
    productId: extras?.productId ?? PRODUCT_ID,
    categoryId: extras?.categoryId === undefined ? CATEGORY_ID : extras.categoryId,
    catalogUnitPrice,
    now: extras?.now ?? NOW,
    offers
  });
}

const activeProduct = offer({ id: "p-20", name: "Product 20%" });
const disabled = offer({ id: "p-disabled", name: "Disabled", isEnabled: false });
const future = offer({
  id: "p-future",
  name: "Future",
  startsAt: new Date("2026-09-01T00:00:00.000Z"),
  endsAt: new Date("2026-09-30T00:00:00.000Z")
});
const expired = offer({
  id: "p-expired",
  name: "Expired",
  startsAt: new Date("2026-07-01T00:00:00.000Z"),
  endsAt: new Date("2026-07-31T23:59:59.000Z")
});

// Eligibility
const applied = evaluate(1000, [activeProduct]);
assert.equal(applied.appliedOffer?.id, "p-20");
assert.equal(applied.basePrice, 1000);
assert.equal(applied.discountPerUnit, 200);
assert.equal(applied.effectivePrice, 800);

assert.equal(evaluate(1000, [disabled]).appliedOffer, null);
assert.equal(evaluate(1000, [future]).appliedOffer, null);
assert.equal(evaluate(1000, [expired]).appliedOffer, null);

// Discount calculations
assert.equal(evaluate(1000, [offer({ id: "pct", name: "10%", discountValue: 10 })]).discountPerUnit, 100);
assert.equal(
  evaluate(1000, [
    offer({
      id: "fixed-150",
      name: "₹150",
      discountType: "fixed_amount",
      discountValue: 150
    })
  ]).discountPerUnit,
  150
);

const floor = evaluate(100, [
  offer({
    id: "fixed-too-big",
    name: "₹500",
    discountType: "fixed_amount",
    discountValue: 500
  })
]);
assert.equal(floor.effectivePrice, 0);
assert.equal(floor.discountPerUnit, 100);

const fullOff = evaluate(1499, [offer({ id: "pct-100", name: "100%", discountValue: 100 })]);
assert.equal(fullOff.effectivePrice, 0);
assert.equal(fullOff.discountPerUnit, 1499);

// Conflicts
const category30 = offer({
  id: "c-30",
  name: "Category 30%",
  scope: "category" as OfferScope,
  discountValue: 30,
  productIds: [],
  categoryIds: [CATEGORY_ID]
});
const productBeatsCategory = evaluate(1000, [activeProduct, category30]);
assert.equal(productBeatsCategory.appliedOffer?.id, "p-20");
assert.equal(productBeatsCategory.discountPerUnit, 200);
assert.equal(productBeatsCategory.effectivePrice, 800);

const highestProduct = evaluate(1000, [
  offer({ id: "p-10", name: "10%", discountValue: 10 }),
  offer({
    id: "p-fixed",
    name: "₹150",
    discountType: "fixed_amount",
    discountValue: 150
  })
]);
assert.equal(highestProduct.appliedOffer?.id, "p-fixed");
assert.equal(highestProduct.discountPerUnit, 150);

const category10 = offer({
  id: "c-10",
  name: "Category 10%",
  scope: "category",
  discountValue: 10,
  productIds: [],
  categoryIds: [CATEGORY_ID]
});
const categoryFixed = offer({
  id: "c-fixed",
  name: "Category ₹150",
  scope: "category",
  discountType: "fixed_amount",
  discountValue: 150,
  productIds: [],
  categoryIds: [CATEGORY_ID]
});
const highestCategory = evaluate(1000, [category10, categoryFixed]);
assert.equal(highestCategory.appliedOffer?.id, "c-fixed");
assert.equal(highestCategory.discountPerUnit, 150);

// No stacking: product 20% + category 30% must not become 50%
assert.equal(productBeatsCategory.discountPerUnit, 200);
assert.notEqual(productBeatsCategory.effectivePrice, 500);

// Boundaries: inclusive starts_at / ends_at
const windowOffer = offer({
  id: "window",
  name: "Window",
  startsAt: new Date("2026-08-26T12:00:00.000Z"),
  endsAt: new Date("2026-08-26T18:00:00.000Z")
});
assert.equal(
  evaluate(1000, [windowOffer], { now: new Date("2026-08-26T12:00:00.000Z") }).appliedOffer?.id,
  "window"
);
assert.equal(
  evaluate(1000, [windowOffer], { now: new Date("2026-08-26T18:00:00.000Z") }).appliedOffer?.id,
  "window"
);
assert.equal(
  evaluate(1000, [windowOffer], { now: new Date("2026-08-26T11:59:59.999Z") }).appliedOffer,
  null
);
assert.equal(
  evaluate(1000, [windowOffer], { now: new Date("2026-08-26T18:00:00.001Z") }).appliedOffer,
  null
);

console.log("offer evaluation checks passed");
