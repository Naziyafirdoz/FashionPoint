/**
 * Non-production checks for homepage hero campaign activation rules.
 * Does not call the remote database or insert campaigns.
 * Usage: node scripts/verify-homepage-hero-campaign.ts
 */
import assert from "node:assert/strict";
import { isSafeInternalCtaUrl, parseHomepageHeroCampaignRow } from "../src/lib/campaigns/homepage-hero-campaign.ts";

const NOW = new Date("2026-08-27T10:00:00.000Z");
const CLOUDINARY = "https://res.cloudinary.com/demo/image/upload/v1/fashionpoint/campaigns/eid.jpg";

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Eid Campaign",
    occasion: "Eid",
    display_mode: "image_with_content",
    is_enabled: true,
    hero_image_url: CLOUDINARY,
    mobile_image_url: null,
    heading: "Eid Collection",
    subheading: "New festive looks",
    offer_text: "Limited time",
    cta_text: "Shop now",
    cta_url: "/products",
    starts_at: "2026-08-01T00:00:00.000Z",
    ends_at: "2026-09-01T00:00:00.000Z",
    priority: 0,
    ...overrides
  };
}

const active = parseHomepageHeroCampaignRow(baseRow(), NOW);
assert.ok(active, "Test 4: active valid campaign should parse");
assert.equal(active?.heading, "Eid Collection");
assert.equal(active?.ctaUrl, "/products");
assert.equal(active?.contentStyle, null, "missing content_style stays null and still activates");

const withInvalidStyle = parseHomepageHeroCampaignRow(
  baseRow({ content_style: { heading: "not-a-style", fontFamily: "Comic Sans" } }),
  NOW
);
assert.ok(withInvalidStyle, "invalid content_style must not deactivate the campaign");
assert.equal(withInvalidStyle?.contentStyle, null);

const validStyle = {
  heading: { fontFamily: "playfair", fontSize: "lg", fontWeight: "semibold", fontStyle: "normal", color: "#FDF8F0" },
  subheading: { fontFamily: "inter", fontSize: "md", color: "#FDF8F0" },
  offer: { fontFamily: "inter", fontSize: "sm", color: "#D4A820" },
  cta: { backgroundColor: "#7B0D2B", textColor: "#FFFFFF" },
  layout: { horizontalAlign: "center" },
  overlay: { enabled: true, color: "#1A1012", opacity: 0.5 }
};
const withStyle = parseHomepageHeroCampaignRow(baseRow({ content_style: validStyle }), NOW);
assert.equal(withStyle?.contentStyle?.layout.horizontalAlign, "center");
assert.equal(withStyle?.contentStyle?.cta.backgroundColor, "#7B0D2B");

const imageOnly = parseHomepageHeroCampaignRow(
  baseRow({ display_mode: "image_only", heading: null, cta_text: null, cta_url: null }),
  NOW
);
assert.ok(imageOnly, "image_only without heading should parse");
assert.equal(imageOnly?.displayMode, "image_only");

assert.equal(
  parseHomepageHeroCampaignRow(baseRow({ is_enabled: false }), NOW),
  null,
  "Test 2: disabled campaign"
);

assert.equal(
  parseHomepageHeroCampaignRow(
    baseRow({ starts_at: "2026-09-01T00:00:00.000Z", ends_at: "2026-09-15T00:00:00.000Z" }),
    NOW
  ),
  null,
  "Test 3: scheduled future campaign"
);

assert.equal(
  parseHomepageHeroCampaignRow(
    baseRow({ starts_at: "2026-07-01T00:00:00.000Z", ends_at: "2026-08-01T00:00:00.000Z" }),
    NOW
  ),
  null,
  "Test 5: expired campaign"
);

assert.equal(
  parseHomepageHeroCampaignRow(baseRow({ heading: "  " }), NOW),
  null,
  "Test 6: image_with_content missing heading"
);

assert.equal(
  parseHomepageHeroCampaignRow(baseRow({ hero_image_url: "/assets/hero/original-bg.png" }), NOW),
  null,
  "Test 6: default hero asset URL"
);

assert.equal(
  parseHomepageHeroCampaignRow(
    baseRow({ hero_image_url: "https://cdn.example.com/assets/hero/campaign.jpg" }),
    NOW
  ),
  null,
  "Test 6: URL containing /assets/hero/"
);

assert.equal(
  parseHomepageHeroCampaignRow(baseRow({ cta_text: "Shop", cta_url: "" }), NOW),
  null,
  "Test 6: CTA text without URL"
);

assert.equal(
  parseHomepageHeroCampaignRow(baseRow({ cta_text: "", cta_url: "/products" }), NOW),
  null,
  "Test 6: CTA URL without text"
);

assert.equal(
  parseHomepageHeroCampaignRow(baseRow({ cta_url: "javascript:alert(1)" }), NOW),
  null,
  "Test 6: javascript CTA"
);

assert.equal(
  parseHomepageHeroCampaignRow(baseRow({ cta_url: "https://evil.example/phish" }), NOW),
  null,
  "Test 6: external CTA"
);

assert.equal(
  parseHomepageHeroCampaignRow(baseRow({ display_mode: "video" }), NOW),
  null,
  "Test 6: invalid display_mode"
);

assert.equal(
  parseHomepageHeroCampaignRow(
    baseRow({ starts_at: "2026-08-27T10:00:00.000Z", ends_at: "2026-08-27T10:00:00.000Z" }),
    NOW
  ),
  null,
  "Test 6: ends_at not after starts_at"
);

assert.equal(isSafeInternalCtaUrl("/products"), true);
assert.equal(isSafeInternalCtaUrl("/category/party-wear"), true);
assert.equal(isSafeInternalCtaUrl("/#explore-our-collections"), true);
assert.equal(isSafeInternalCtaUrl("//evil.example"), false);
assert.equal(isSafeInternalCtaUrl("javascript:alert(1)"), false);

console.log("homepage-hero-campaign verification passed");
