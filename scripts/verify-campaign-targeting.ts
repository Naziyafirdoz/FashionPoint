/**
 * Non-production checks for shared catalog targeting parser used by Offers and Campaigns.
 * Does not call the remote database.
 * Usage: npx tsx scripts/verify-campaign-targeting.ts
 */
import assert from "node:assert/strict";
import { parseCatalogTargeting } from "../src/lib/admin/catalog-targeting.ts";
import { parseCampaignUpsertInput } from "../src/lib/admin/campaigns.ts";
import { parseOfferUpsertInput } from "../src/lib/admin/offers.ts";

const PRODUCT_A = "11111111-1111-1111-1111-111111111111";
const PRODUCT_B = "22222222-2222-2222-2222-222222222222";
const CATEGORY_A = "33333333-3333-3333-3333-333333333333";

const productTargeting = parseCatalogTargeting(
  { scope: "product", productIds: [PRODUCT_A, PRODUCT_A, PRODUCT_B] },
  "campaign"
);
assert.equal(productTargeting.ok, true);
if (productTargeting.ok) {
  assert.deepEqual(productTargeting.targeting.productIds, [PRODUCT_A, PRODUCT_B]);
  assert.deepEqual(productTargeting.targeting.categoryIds, []);
}

const mixedCampaign = parseCatalogTargeting(
  { scope: "product", productIds: [PRODUCT_A], categoryIds: [CATEGORY_A] },
  "campaign"
);
assert.equal(mixedCampaign.ok, false);
if (!mixedCampaign.ok) assert.match(mixedCampaign.error, /product campaign/);

const mixedOffer = parseCatalogTargeting(
  { scope: "product", productIds: [PRODUCT_A], categoryIds: [CATEGORY_A] },
  "offer"
);
assert.equal(mixedOffer.ok, false);
if (!mixedOffer.ok) assert.match(mixedOffer.error, /product offer/);

assert.equal(
  parseCatalogTargeting({ scope: "product", productIds: [] }, "campaign").ok,
  false
);
assert.equal(
  parseCatalogTargeting({ scope: "category", categoryIds: [] }, "campaign").ok,
  false
);
assert.equal(parseCatalogTargeting({ scope: "all", productIds: [PRODUCT_A] }, "campaign").ok, false);

const offerStillRequiresTargets = parseOfferUpsertInput({
  name: "Diwali 20%",
  discountType: "percentage",
  discountValue: 20,
  scope: "product",
  startsAt: "2026-10-01T00:00:00.000Z",
  endsAt: "2026-10-31T23:59:59.000Z",
  isEnabled: true,
  productIds: [PRODUCT_A]
});
assert.equal(offerStillRequiresTargets.ok, true);

const campaignRequiresTargets = parseCampaignUpsertInput({
  name: "Eid Campaign",
  occasion: "Eid",
  displayMode: "image_with_content",
  isEnabled: true,
  heroImageUrl: "https://res.cloudinary.com/demo/image/upload/v1/fashionpoint/campaigns/eid.jpg",
  heading: "Eid Collection",
  startsAt: "2026-08-01T00:00:00.000Z",
  endsAt: "2026-09-01T00:00:00.000Z",
  priority: 0
});
assert.equal(campaignRequiresTargets.ok, false, "campaign upsert without targeting is rejected");

console.log("campaign-targeting verification passed");
