/**
 * Non-production checks for campaign content design allow-lists.
 * Usage: node --experimental-strip-types scripts/verify-campaign-content-style.ts
 */
import assert from "node:assert/strict";
import {
  DEFAULT_CAMPAIGN_CONTENT_STYLE,
  contentStyleFromPaletteTokens,
  parseCampaignContentStyle,
  parseCampaignContentStyleForAdmin,
  parseCustomFontSize,
  parseCustomFontWeight,
  parseSafeColor,
  parseSafeFontFamily
} from "../src/lib/campaigns/campaign-hero-content-style.ts";

assert.ok(parseCampaignContentStyle(DEFAULT_CAMPAIGN_CONTENT_STYLE));
assert.equal(parseCampaignContentStyle(null), null);
assert.equal(parseCampaignContentStyle({}), null);
assert.equal(parseSafeColor("javascript:alert(1)"), null);
assert.equal(parseSafeColor("url(https://evil.example)"), null);
assert.equal(parseSafeColor("#fff"), "#FFFFFF");
assert.equal(parseSafeColor("rgb(123, 13, 43)"), "#7B0D2B");

const fromPalette = contentStyleFromPaletteTokens({
  headingColor: "rgb(253, 248, 240)",
  bodyColor: "rgba(253, 248, 240, 0.9)",
  accentColor: "rgb(241, 205, 180)",
  buttonBg: "rgb(13, 17, 28)",
  buttonText: "rgb(253, 248, 240)",
  overlayStart: "rgba(44, 28, 24, 0.5)"
});
assert.equal(fromPalette.heading.fontFamily, "playfair");
assert.equal(fromPalette.subheading.fontFamily, "inter");
assert.equal(fromPalette.overlay.enabled, true);
assert.equal(fromPalette.overlay.opacity, 0.5);
assert.equal(fromPalette.cta.backgroundColor, "#0D111C");

assert.equal(parseCampaignContentStyleForAdmin(null).ok, true);
assert.equal(parseCampaignContentStyleForAdmin({}).ok, false);
assert.equal(parseCampaignContentStyleForAdmin(DEFAULT_CAMPAIGN_CONTENT_STYLE).ok, true);

const presetStyle = parseCampaignContentStyle(DEFAULT_CAMPAIGN_CONTENT_STYLE);
assert.ok(presetStyle);
assert.equal(presetStyle?.heading.fontFamily, "playfair");

const customStyle = parseCampaignContentStyle({
  ...DEFAULT_CAMPAIGN_CONTENT_STYLE,
  heading: {
    ...DEFAULT_CAMPAIGN_CONTENT_STYLE.heading,
    fontFamily: "custom",
    customFontFamily: "Times New Roman, serif",
    fontSize: "custom",
    customFontSize: { value: 52, unit: "px" },
    fontWeight: "custom",
    customFontWeight: 500
  },
  subheading: {
    ...DEFAULT_CAMPAIGN_CONTENT_STYLE.subheading,
    fontFamily: "custom",
    customFontFamily: "Arial, sans-serif",
    fontSize: "custom",
    customFontSize: { value: 1.1, unit: "rem" }
  },
  offer: {
    ...DEFAULT_CAMPAIGN_CONTENT_STYLE.offer,
    fontFamily: "custom",
    customFontFamily: "Georgia",
    fontSize: "custom",
    customFontSize: { value: 14, unit: "px" }
  }
});
assert.ok(customStyle);
assert.equal(customStyle?.heading.customFontFamily, "Times New Roman, serif");
assert.equal(customStyle?.heading.customFontSize?.value, 52);
assert.equal(customStyle?.heading.customFontWeight, 500);

assert.equal(parseSafeFontFamily("Georgia"), "Georgia");
assert.equal(parseSafeFontFamily("Georgia, serif"), "Georgia, serif");
assert.equal(parseSafeFontFamily("Arial, sans-serif"), "Arial, sans-serif");
assert.equal(parseSafeFontFamily("Times New Roman"), "Times New Roman");
assert.equal(parseSafeFontFamily("url(https://evil.com/font)"), null);
assert.equal(parseSafeFontFamily("@import"), null);
assert.equal(parseSafeFontFamily("Georgia; color:red"), null);
assert.equal(parseSafeFontFamily("var(--evil)"), null);
assert.equal(parseSafeFontFamily("javascript:alert(1)"), null);

assert.equal(parseCustomFontSize({ value: 52, unit: "px" })?.value, 52);
assert.equal(parseCustomFontSize({ value: 3.5, unit: "rem" })?.unit, "rem");
assert.equal(parseCustomFontSize({ value: -1, unit: "px" }), null);
assert.equal(parseCustomFontSize({ value: 0, unit: "px" }), null);
assert.equal(parseCustomFontSize({ value: 999, unit: "px" }), null);
assert.equal(parseCustomFontSize({ value: "huge", unit: "px" }), null);

assert.equal(parseCustomFontWeight(500), 500);
assert.equal(parseCustomFontWeight(150), null);
assert.equal(parseCustomFontWeight(50), null);

const invalidCustom = parseCampaignContentStyle({
  ...DEFAULT_CAMPAIGN_CONTENT_STYLE,
  heading: {
    ...DEFAULT_CAMPAIGN_CONTENT_STYLE.heading,
    fontFamily: "custom",
    customFontFamily: "Georgia; color:red"
  }
});
assert.equal(invalidCustom, null, "invalid custom font fails the saved style object, not campaign activation");

console.log("campaign-content-style: all checks passed");
