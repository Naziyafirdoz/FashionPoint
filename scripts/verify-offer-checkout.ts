/**
 * Checkout wiring checks for festival offers.
 * Usage: npx tsx scripts/verify-offer-checkout.ts
 */
import assert from "node:assert/strict";
import { moneyAmountsMatch, resolveAuthoritativeDiscount } from "../src/lib/checkout/authoritative-pricing.ts";
import { validateOrderItems } from "../src/lib/checkout/validation.ts";
import { amountToPaise } from "../src/lib/checkout/totals.ts";
import { priceOfferCart } from "../src/lib/offers/price-lines.ts";
import { roundOfferMoney } from "../src/lib/offers/evaluate.ts";
import type { OfferCandidate, OfferScope } from "../src/lib/offers/types.ts";

const PRODUCT_ID = "product-1";
const OTHER_PRODUCT_ID = "product-2";
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

function price(
  catalogUnitPrice: number,
  offers: OfferCandidate[],
  extras?: { productId?: string; categoryId?: string | null; quantity?: number; now?: Date }
) {
  return priceOfferCart(
    [
      {
        productId: extras?.productId ?? PRODUCT_ID,
        categoryId: extras?.categoryId === undefined ? CATEGORY_ID : extras.categoryId,
        catalogUnitPrice,
        quantity: extras?.quantity ?? 1
      }
    ],
    offers,
    extras?.now ?? NOW
  );
}

const pct20 = offer({ id: "p-20", name: "Product 20%" });
const priced20 = price(1000, [pct20]);
assert.equal(priced20.lines[0].discountPerUnit, 200);
assert.equal(priced20.lines[0].effectiveUnitPrice, 800);
assert.equal(priced20.subtotalBeforeOffers, 1000);
assert.equal(priced20.totalOfferDiscount, 200);
assert.equal(priced20.subtotalAfterOffers, 800);

const fixed500 = price(2000, [
  offer({
    id: "fixed-500",
    name: "₹500",
    discountType: "fixed_amount",
    discountValue: 500
  })
]);
assert.equal(fixed500.lines[0].discountPerUnit, 500);
assert.equal(fixed500.subtotalAfterOffers, 1500);

const capped = price(100, [
  offer({
    id: "fixed-too-big",
    name: "₹500 cap",
    discountType: "fixed_amount",
    discountValue: 500
  })
]);
assert.equal(capped.lines[0].discountPerUnit, 100);
assert.equal(capped.subtotalAfterOffers, 0);

const fullOff = price(1499, [offer({ id: "pct-100", name: "100%", discountValue: 100 })]);
assert.equal(fullOff.subtotalAfterOffers, 0);
assert.equal(fullOff.totalOfferDiscount, 1499);

assert.equal(price(1000, [pct20]).lines[0].appliedOffer?.scope, "product");

const category30 = offer({
  id: "c-30",
  name: "Category 30%",
  scope: "category" as OfferScope,
  discountValue: 30,
  productIds: [],
  categoryIds: [CATEGORY_ID]
});
assert.equal(price(1000, [category30]).lines[0].appliedOffer?.id, "c-30");
assert.equal(price(1000, [category30]).totalOfferDiscount, 300);

const productBeatsCategory = price(1000, [pct20, category30]);
assert.equal(productBeatsCategory.lines[0].appliedOffer?.id, "p-20");
assert.equal(productBeatsCategory.totalOfferDiscount, 200);

const highestProduct = price(1000, [
  offer({ id: "p-10", name: "10%", discountValue: 10 }),
  offer({
    id: "p-fixed",
    name: "₹150",
    discountType: "fixed_amount",
    discountValue: 150
  })
]);
assert.equal(highestProduct.lines[0].appliedOffer?.id, "p-fixed");
assert.equal(highestProduct.totalOfferDiscount, 150);

const highestCategory = price(1000, [
  offer({
    id: "c-10",
    name: "Category 10%",
    scope: "category",
    discountValue: 10,
    productIds: [],
    categoryIds: [CATEGORY_ID]
  }),
  offer({
    id: "c-fixed",
    name: "Category ₹150",
    scope: "category",
    discountType: "fixed_amount",
    discountValue: 150,
    productIds: [],
    categoryIds: [CATEGORY_ID]
  })
]);
assert.equal(highestCategory.lines[0].appliedOffer?.id, "c-fixed");

const windowOffer = offer({
  id: "window",
  name: "Window",
  startsAt: new Date("2026-08-26T12:00:00.000Z"),
  endsAt: new Date("2026-08-26T18:00:00.000Z")
});
assert.equal(price(1000, [windowOffer], { now: new Date("2026-08-26T12:00:00.000Z") }).totalOfferDiscount, 200);
assert.equal(price(1000, [windowOffer], { now: new Date("2026-08-26T18:00:00.000Z") }).totalOfferDiscount, 200);
assert.equal(price(1000, [windowOffer], { now: new Date("2026-08-26T18:00:00.001Z") }).totalOfferDiscount, 0);
assert.equal(
  price(1000, [
    offer({
      id: "future",
      name: "Future",
      startsAt: new Date("2026-09-01T00:00:00.000Z"),
      endsAt: new Date("2026-09-30T00:00:00.000Z")
    })
  ]).totalOfferDiscount,
  0
);

assert.equal(
  price(1000, [
    offer({
      id: "ongoing",
      name: "Ongoing",
      startsAt: new Date("2026-08-01T00:00:00.000Z"),
      endsAt: null
    })
  ]).totalOfferDiscount,
  200
);

assert.equal(
  price(1000, [offer({ id: "disabled", name: "Disabled", isEnabled: false })]).totalOfferDiscount,
  0
);

const qty3 = price(1000, [pct20], { quantity: 3 });
assert.equal(qty3.lines[0].lineDiscount, 600);
assert.equal(qty3.lines[0].lineTotal, 2400);
assert.equal(qty3.subtotalBeforeOffers, 3000);
assert.equal(qty3.totalOfferDiscount, 600);
assert.equal(qty3.subtotalAfterOffers, 2400);

const mixed = priceOfferCart(
  [
    {
      productId: PRODUCT_ID,
      categoryId: CATEGORY_ID,
      catalogUnitPrice: 1000,
      quantity: 2
    },
    {
      productId: OTHER_PRODUCT_ID,
      categoryId: "other-category",
      catalogUnitPrice: 500,
      quantity: 1
    }
  ],
  [pct20],
  NOW
);
assert.equal(mixed.lines[0].lineDiscount, 400);
assert.equal(mixed.lines[1].lineDiscount, 0);
assert.equal(mixed.subtotalBeforeOffers, 2500);
assert.equal(mixed.totalOfferDiscount, 400);
assert.equal(mixed.subtotalAfterOffers, 2100);

const ignored = resolveAuthoritativeDiscount(99999);
assert.equal(ignored.ok, true);
assert.equal(ignored.discount, 0);
assert.equal(resolveAuthoritativeDiscount("50").discount, 0);

assert.equal(moneyAmountsMatch(1000, 1000), true);
assert.equal(moneyAmountsMatch(800, 1000), false);

const shipping = 80;
const serverTotal = roundOfferMoney(priced20.subtotalBeforeOffers - priced20.totalOfferDiscount + shipping);
assert.equal(serverTotal, 880);
assert.equal(amountToPaise(serverTotal), 88000);
assert.equal(amountToPaise(serverTotal), amountToPaise(priced20.subtotalAfterOffers + shipping));

assert.equal(price(1000, []).totalOfferDiscount, 0);
assert.equal(price(1000, [pct20], { productId: "wrong-product" }).totalOfferDiscount, 0);
assert.equal(price(1000, [category30], { categoryId: "wrong-category" }).totalOfferDiscount, 0);

const tied = price(1000, [
  offer({ id: "z-tie", name: "Tie Z", discountValue: 20 }),
  offer({ id: "a-tie", name: "Tie A", discountValue: 20 })
]);
assert.equal(tied.lines[0].appliedOffer?.id, "a-tie");

const quotedNow = new Date("2026-08-26T18:00:00.000Z");
const createdLater = new Date("2026-08-26T18:00:00.001Z");
assert.equal(price(1000, [windowOffer], { now: quotedNow }).totalOfferDiscount, 200);
assert.equal(price(1000, [windowOffer], { now: createdLater }).totalOfferDiscount, 0);

const parsedIntent = validateOrderItems([
  {
    productId: PRODUCT_ID,
    name: "Hack",
    size: "M(36)",
    color: "Red",
    quantity: 1,
    image: "",
    slug: "hack",
    price: 1,
    discount: 99999,
    appliedOffer: { id: "client-forced-offer" },
    effectiveUnitPrice: 1,
    offerId: "client-forced-offer"
  }
]);
assert.equal(parsedIntent.ok, true);
if (parsedIntent.ok) {
  assert.equal(parsedIntent.items[0].clientPrice, 1);
  assert.equal("appliedOffer" in parsedIntent.items[0], false);
  assert.equal("offerId" in parsedIntent.items[0], false);
  assert.equal(moneyAmountsMatch(parsedIntent.items[0].clientPrice ?? 0, 1000), false);
}

console.log("offer checkout checks passed");
