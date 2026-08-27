/**
 * Non-production checks for Festival Offers Admin validation helpers.
 * Does not call the remote database or insert offers.
 * Usage: node scripts/verify-admin-offers.ts
 */
import assert from "node:assert/strict";
import {
  deriveOfferStatus,
  findMissingIds,
  offerSnapshotWrite,
  parseOfferUpsertInput,
  toAdminOfferDto,
  uniqueIds
} from "../src/lib/admin/offers.ts";

const PRODUCT_A = "11111111-1111-1111-1111-111111111111";
const PRODUCT_B = "22222222-2222-2222-2222-222222222222";
const CATEGORY_A = "33333333-3333-3333-3333-333333333333";

function baseProductBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Diwali 20%",
    description: "Festival sale",
    discountType: "percentage",
    discountValue: 20,
    scope: "product",
    startsAt: "2026-10-01T00:00:00.000Z",
    endsAt: "2026-10-31T23:59:59.000Z",
    isEnabled: true,
    productIds: [PRODUCT_A],
    ...overrides
  };
}

function baseCategoryBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Designer 15%",
    discountType: "percentage",
    discountValue: 15,
    scope: "category",
    startsAt: "2026-10-01T00:00:00.000Z",
    endsAt: "2026-10-31T23:59:59.000Z",
    isEnabled: true,
    categoryIds: [CATEGORY_A],
    ...overrides
  };
}

const validProduct = parseOfferUpsertInput(baseProductBody());
assert.equal(validProduct.ok, true);
if (validProduct.ok) {
  assert.equal(validProduct.input.name, "Diwali 20%");
  assert.equal(validProduct.input.productIds.length, 1);
  assert.deepEqual(validProduct.input.categoryIds, []);
}

assert.equal(parseOfferUpsertInput(baseProductBody({ name: "   " })).ok, false);
assert.equal(parseOfferUpsertInput(baseProductBody({ name: "" })).ok, false);
assert.equal(parseOfferUpsertInput(baseProductBody({ name: 12 })).ok, false);

const invalidType = parseOfferUpsertInput(baseProductBody({ discountType: "coupon" }));
assert.equal(invalidType.ok, false);
if (!invalidType.ok) assert.match(invalidType.error, /percentage or fixed_amount/);

const overPercent = parseOfferUpsertInput(baseProductBody({ discountValue: 101 }));
assert.equal(overPercent.ok, false);
if (!overPercent.ok) assert.match(overPercent.error, /100/);

assert.equal(parseOfferUpsertInput(baseProductBody({ discountValue: 0 })).ok, false);
assert.equal(parseOfferUpsertInput(baseProductBody({ discountValue: -5 })).ok, false);
assert.equal(parseOfferUpsertInput(baseProductBody({ discountValue: "abc" })).ok, false);

const invalidScope = parseOfferUpsertInput(baseProductBody({ scope: "all" }));
assert.equal(invalidScope.ok, false);
if (!invalidScope.ok) assert.match(invalidScope.error, /product or category/);

assert.equal(parseOfferUpsertInput(baseProductBody({ startsAt: "not-a-date" })).ok, false);
assert.equal(parseOfferUpsertInput(baseProductBody({ endsAt: "nope" })).ok, false);

const badOrder = parseOfferUpsertInput(
  baseProductBody({
    startsAt: "2026-10-31T00:00:00.000Z",
    endsAt: "2026-10-01T00:00:00.000Z"
  })
);
assert.equal(badOrder.ok, false);
if (!badOrder.ok) assert.match(badOrder.error, /later than startsAt/);

const equalDates = parseOfferUpsertInput(
  baseProductBody({
    startsAt: "2026-10-01T00:00:00.000Z",
    endsAt: "2026-10-01T00:00:00.000Z"
  })
);
assert.equal(equalDates.ok, false);

assert.equal(parseOfferUpsertInput(baseProductBody({ productIds: [] })).ok, false);
assert.equal(parseOfferUpsertInput(baseProductBody({ productIds: ["  "] })).ok, false);
assert.equal(parseOfferUpsertInput(baseCategoryBody({ categoryIds: [] })).ok, false);

const mixedProduct = parseOfferUpsertInput(
  baseProductBody({ categoryIds: [CATEGORY_A] })
);
assert.equal(mixedProduct.ok, false);

const mixedCategory = parseOfferUpsertInput(
  baseCategoryBody({ productIds: [PRODUCT_A] })
);
assert.equal(mixedCategory.ok, false);

const deduped = parseOfferUpsertInput(
  baseProductBody({ productIds: [PRODUCT_A, PRODUCT_A, PRODUCT_B] })
);
assert.equal(deduped.ok, true);
if (deduped.ok) {
  assert.deepEqual(deduped.input.productIds, [PRODUCT_A, PRODUCT_B]);
}

assert.deepEqual(uniqueIds([PRODUCT_A, PRODUCT_A, PRODUCT_B]), [PRODUCT_A, PRODUCT_B]);
assert.deepEqual(findMissingIds([PRODUCT_A, PRODUCT_B], [PRODUCT_A]), [PRODUCT_B]);
assert.deepEqual(findMissingIds([PRODUCT_A], [PRODUCT_A, PRODUCT_B]), []);

const now = new Date("2026-10-15T12:00:00.000Z");
assert.equal(
  deriveOfferStatus(
    { isEnabled: false, startsAt: "2026-10-01T00:00:00.000Z", endsAt: "2026-10-31T00:00:00.000Z" },
    now
  ),
  "disabled"
);
assert.equal(
  deriveOfferStatus(
    { isEnabled: true, startsAt: "2026-11-01T00:00:00.000Z", endsAt: "2026-11-30T00:00:00.000Z" },
    now
  ),
  "scheduled"
);
assert.equal(
  deriveOfferStatus(
    { isEnabled: true, startsAt: "2026-10-01T00:00:00.000Z", endsAt: "2026-10-31T00:00:00.000Z" },
    now
  ),
  "active"
);
assert.equal(
  deriveOfferStatus(
    { isEnabled: true, startsAt: "2026-09-01T00:00:00.000Z", endsAt: "2026-09-30T00:00:00.000Z" },
    now
  ),
  "expired"
);
assert.equal(
  deriveOfferStatus(
    { isEnabled: true, startsAt: now, endsAt: "2026-10-31T00:00:00.000Z" },
    now
  ),
  "active"
);
assert.equal(
  deriveOfferStatus(
    {
      isEnabled: true,
      startsAt: "2026-10-01T00:00:00.000Z",
      endsAt: now
    },
    now
  ),
  "active"
);

const dto = toAdminOfferDto(
  {
    id: "offer-1",
    name: "Test",
    description: null,
    discount_type: "fixed_amount",
    discount_value: 150,
    scope: "product",
    starts_at: "2026-10-01T00:00:00.000Z",
    ends_at: "2026-10-31T00:00:00.000Z",
    is_enabled: true,
    banner_image_url: "https://res.cloudinary.com/demo/offer-banner.jpg",
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-02T00:00:00.000Z"
  },
  { productIds: [PRODUCT_A], categoryIds: [] },
  now
);
assert.equal(dto.status, "active");
assert.equal(dto.discountType, "fixed_amount");
assert.equal(dto.bannerImageUrl, "https://res.cloudinary.com/demo/offer-banner.jpg");
assert.deepEqual(dto.productIds, [PRODUCT_A]);
assert.deepEqual(dto.categoryIds, []);

const dtoNoBanner = toAdminOfferDto(
  {
    id: "offer-2",
    name: "No Banner",
    description: null,
    discount_type: "percentage",
    discount_value: 10,
    scope: "product",
    starts_at: "2026-10-01T00:00:00.000Z",
    ends_at: "2026-10-31T00:00:00.000Z",
    is_enabled: true,
    banner_image_url: null,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-02T00:00:00.000Z"
  },
  { productIds: [PRODUCT_A], categoryIds: [] },
  now
);
assert.equal(dtoNoBanner.bannerImageUrl, null);

assert.equal(parseOfferUpsertInput(baseProductBody()).ok, true);
const omittedBanner = parseOfferUpsertInput(baseProductBody());
assert.equal(omittedBanner.ok, true);
if (omittedBanner.ok) assert.equal(omittedBanner.input.bannerImageUrl, null);

const emptyBanner = parseOfferUpsertInput(baseProductBody({ bannerImageUrl: "" }));
assert.equal(emptyBanner.ok, true);
if (emptyBanner.ok) assert.equal(emptyBanner.input.bannerImageUrl, null);

const nullBanner = parseOfferUpsertInput(baseProductBody({ bannerImageUrl: null }));
assert.equal(nullBanner.ok, true);
if (nullBanner.ok) assert.equal(nullBanner.input.bannerImageUrl, null);

const whitespaceBanner = parseOfferUpsertInput(baseProductBody({ bannerImageUrl: "   " }));
assert.equal(whitespaceBanner.ok, true);
if (whitespaceBanner.ok) assert.equal(whitespaceBanner.input.bannerImageUrl, null);

const invalidBanner = parseOfferUpsertInput(baseProductBody({ bannerImageUrl: 12 }));
assert.equal(invalidBanner.ok, false);
if (!invalidBanner.ok) assert.match(invalidBanner.error, /bannerImageUrl/);

const validBanner = parseOfferUpsertInput(
  baseProductBody({ bannerImageUrl: "  https://res.cloudinary.com/demo/offer.jpg  " })
);
assert.equal(validBanner.ok, true);
if (validBanner.ok) {
  assert.equal(validBanner.input.bannerImageUrl, "https://res.cloudinary.com/demo/offer.jpg");
}

const snakeBanner = parseOfferUpsertInput(
  baseProductBody({ banner_image_url: "https://res.cloudinary.com/demo/snake.jpg" })
);
assert.equal(snakeBanner.ok, true);
if (snakeBanner.ok) {
  assert.equal(snakeBanner.input.bannerImageUrl, "https://res.cloudinary.com/demo/snake.jpg");
}

const snapshot = offerSnapshotWrite({
  id: "offer-1",
  name: "Test",
  description: null,
  discount_type: "fixed_amount",
  discount_value: 150,
  scope: "product",
  starts_at: "2026-10-01T00:00:00.000Z",
  ends_at: "2026-10-31T00:00:00.000Z",
  is_enabled: true,
  banner_image_url: "https://res.cloudinary.com/demo/keep.jpg",
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-02T00:00:00.000Z"
});
assert.equal(snapshot.banner_image_url, "https://res.cloudinary.com/demo/keep.jpg");
assert.equal(snapshot.name, "Test");

const snapshotNullBanner = offerSnapshotWrite({
  id: "offer-2",
  name: "No Banner",
  description: null,
  discount_type: "percentage",
  discount_value: 10,
  scope: "product",
  starts_at: "2026-10-01T00:00:00.000Z",
  ends_at: "2026-10-31T00:00:00.000Z",
  is_enabled: true,
  banner_image_url: null,
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-02T00:00:00.000Z"
});
assert.equal(snapshotNullBanner.banner_image_url, null);

const omittedEnabled = parseOfferUpsertInput(
  baseProductBody({ isEnabled: undefined })
);
assert.equal(omittedEnabled.ok, true);
if (omittedEnabled.ok) assert.equal(omittedEnabled.input.isEnabled, false);

console.log("admin offer validation checks passed");
