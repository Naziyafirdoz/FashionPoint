/**
 * Non-production checks for homepage campaign admin validation helpers.
 * Does not call the remote database or insert campaigns.
 * Usage: node scripts/verify-admin-campaigns.ts
 */
import assert from "node:assert/strict";
import {
  deriveCampaignStatus,
  parseCampaignUpsertInput
} from "../src/lib/admin/campaigns.ts";

const CLOUDINARY = "https://res.cloudinary.com/demo/image/upload/v1/fashionpoint/campaigns/eid.jpg";

function baseBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Eid Campaign",
    occasion: "Eid",
    displayMode: "image_with_content",
    scope: "product",
    productIds: ["11111111-1111-1111-1111-111111111111"],
    categoryIds: [],
    isEnabled: true,
    heroImageUrl: CLOUDINARY,
    mobileImageUrl: null,
    heading: "Eid Collection",
    subheading: "Festive looks",
    offerText: "Limited time",
    ctaText: "Shop now",
    ctaUrl: "/products",
    startsAt: "2026-08-01T00:00:00.000Z",
    endsAt: "2026-09-01T00:00:00.000Z",
    priority: 0,
    ...overrides
  };
}

const valid = parseCampaignUpsertInput(baseBody());
assert.equal(valid.ok, true);
if (valid.ok) {
  assert.equal(valid.input.heading, "Eid Collection");
  assert.equal(valid.input.ctaUrl, "/products");
  assert.equal(valid.input.scope, "product");
  assert.deepEqual(valid.input.productIds, ["11111111-1111-1111-1111-111111111111"]);
  assert.deepEqual(valid.input.categoryIds, []);
}

const imageOnly = parseCampaignUpsertInput(
  baseBody({ displayMode: "image_only", heading: "", ctaText: "", ctaUrl: "" })
);
assert.equal(imageOnly.ok, true);

assert.equal(parseCampaignUpsertInput(baseBody({ name: "  " })).ok, false, "name required");
assert.equal(parseCampaignUpsertInput(baseBody({ heading: "" })).ok, false, "heading required for content");
assert.equal(
  parseCampaignUpsertInput(baseBody({ heroImageUrl: "/assets/hero/original-bg.png" })).ok,
  false,
  "default hero assets rejected"
);
assert.equal(
  parseCampaignUpsertInput(baseBody({ ctaText: "Shop", ctaUrl: "" })).ok,
  false,
  "CTA pair required"
);
assert.equal(
  parseCampaignUpsertInput(baseBody({ ctaUrl: "javascript:alert(1)" })).ok,
  false,
  "javascript CTA rejected"
);
assert.equal(
  parseCampaignUpsertInput(baseBody({ ctaUrl: "https://evil.example" })).ok,
  false,
  "external CTA rejected"
);
assert.equal(
  parseCampaignUpsertInput(
    baseBody({ startsAt: "2026-09-01T00:00:00.000Z", endsAt: "2026-08-01T00:00:00.000Z" })
  ).ok,
  false,
  "end after start"
);
assert.equal(
  parseCampaignUpsertInput(baseBody({ displayMode: "video" })).ok,
  false,
  "invalid display mode"
);
assert.equal(parseCampaignUpsertInput(baseBody({ priority: 1.5 })).ok, false, "priority integer");

const PRODUCT_A = "11111111-1111-1111-1111-111111111111";
const CATEGORY_A = "33333333-3333-3333-3333-333333333333";

assert.equal(parseCampaignUpsertInput(baseBody({ productIds: [] })).ok, false, "product scope requires products");
assert.equal(
  parseCampaignUpsertInput(baseBody({ scope: "category", productIds: [], categoryIds: [] })).ok,
  false,
  "category scope requires categories"
);
assert.equal(
  parseCampaignUpsertInput(baseBody({ categoryIds: [CATEGORY_A] })).ok,
  false,
  "mixed category IDs on product campaign rejected"
);
assert.equal(
  parseCampaignUpsertInput(
    baseBody({ scope: "category", productIds: [PRODUCT_A], categoryIds: [CATEGORY_A] })
  ).ok,
  false,
  "mixed product IDs on category campaign rejected"
);
assert.equal(parseCampaignUpsertInput(baseBody({ scope: "all" })).ok, false, "all scope rejected");

const categoryTarget = parseCampaignUpsertInput(
  baseBody({ scope: "category", productIds: [], categoryIds: [CATEGORY_A] })
);
assert.equal(categoryTarget.ok, true);
if (categoryTarget.ok) {
  assert.equal(categoryTarget.input.scope, "category");
  assert.deepEqual(categoryTarget.input.productIds, []);
  assert.deepEqual(categoryTarget.input.categoryIds, [CATEGORY_A]);
}

const customOccasion = parseCampaignUpsertInput(baseBody({ occasion: "Ramadan Special" }));
assert.equal(customOccasion.ok, true, "custom occasion text is allowed");
if (customOccasion.ok) {
  assert.equal(customOccasion.input.occasion, "Ramadan Special");
}
assert.equal(parseCampaignUpsertInput(baseBody({ occasion: "Eid" })).ok, true, "predefined occasion");
assert.equal(parseCampaignUpsertInput(baseBody({ occasion: "custom" })).ok, false, "literal custom rejected");
assert.equal(parseCampaignUpsertInput(baseBody({ occasion: "Custom" })).ok, false, "literal Custom rejected");
assert.equal(
  parseCampaignUpsertInput(baseBody({ heroImageUrl: "" })).ok,
  false,
  "desktop hero image required"
);
assert.equal(
  parseCampaignUpsertInput(baseBody({ mobileImageUrl: "" })).ok,
  true,
  "mobile image may be removed"
);
if (parseCampaignUpsertInput(baseBody({ mobileImageUrl: "" })).ok) {
  const removed = parseCampaignUpsertInput(baseBody({ mobileImageUrl: "" }));
  if (removed.ok) assert.equal(removed.input.mobileImageUrl, null);
}

const missingStyle = parseCampaignUpsertInput(baseBody());
assert.equal(missingStyle.ok, true);
if (missingStyle.ok) assert.equal(missingStyle.input.contentStyle, null);

const validContentStyle = {
  heading: { fontFamily: "playfair", fontSize: "lg", fontWeight: "bold", fontStyle: "italic", color: "#FFF7EC" },
  subheading: { fontFamily: "georgia", fontSize: "sm", color: "#FDF8F0" },
  offer: { fontFamily: "system", fontSize: "md", color: "#D4A820" },
  cta: { backgroundColor: "#123456", textColor: "#FFFFFF" },
  layout: { horizontalAlign: "right" },
  overlay: { enabled: false, color: "#1A1012", opacity: 0.2 }
};
const withStyle = parseCampaignUpsertInput(baseBody({ contentStyle: validContentStyle }));
assert.equal(withStyle.ok, true);
if (withStyle.ok) {
  assert.equal(withStyle.input.contentStyle?.layout.horizontalAlign, "right");
  assert.equal(withStyle.input.contentStyle?.heading.fontStyle, "italic");
}

assert.equal(
  parseCampaignUpsertInput(baseBody({ contentStyle: { heading: { fontFamily: "Comic Sans" } } })).ok,
  false,
  "unknown font rejected"
);
assert.equal(
  parseCampaignUpsertInput(
    baseBody({
      contentStyle: {
        ...validContentStyle,
        heading: { ...validContentStyle.heading, color: "url(https://evil.example)" }
      }
    })
  ).ok,
  false,
  "css url color rejected"
);

const now = new Date("2026-08-27T10:00:00.000Z");
assert.equal(
  deriveCampaignStatus(
    { isEnabled: false, startsAt: "2026-08-01T00:00:00.000Z", endsAt: "2026-09-01T00:00:00.000Z" },
    now
  ),
  "disabled"
);
assert.equal(
  deriveCampaignStatus(
    { isEnabled: true, startsAt: "2026-09-01T00:00:00.000Z", endsAt: "2026-09-15T00:00:00.000Z" },
    now
  ),
  "scheduled"
);
assert.equal(
  deriveCampaignStatus(
    { isEnabled: true, startsAt: "2026-08-01T00:00:00.000Z", endsAt: "2026-09-01T00:00:00.000Z" },
    now
  ),
  "active"
);
assert.equal(
  deriveCampaignStatus(
    { isEnabled: true, startsAt: "2026-07-01T00:00:00.000Z", endsAt: "2026-08-01T00:00:00.000Z" },
    now
  ),
  "expired"
);

console.log("admin-campaigns verification passed");
