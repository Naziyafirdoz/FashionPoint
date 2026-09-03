/**
 * Non-production checks for campaign hero image-aware styling.
 * Does not call the remote database or insert campaigns.
 * Usage: node scripts/verify-campaign-hero-palette.ts
 */
import assert from "node:assert/strict";
import {
  FALLBACK_CAMPAIGN_HERO_TOKENS,
  tokensFromImageData,
  tokensToCssVars
} from "../src/lib/campaigns/campaign-hero-palette.ts";

function makeSolid(r: number, g: number, b: number, width = 48, height = 48): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  }
  return { data, width, height, colorSpace: "srgb" } as ImageData;
}

function makeEmpty(): ImageData {
  return { data: new Uint8ClampedArray(48 * 48 * 4), width: 48, height: 48, colorSpace: "srgb" } as ImageData;
}

function overlayAlpha(css: string) {
  const match = css.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([0-9.]+)\)/i);
  assert.ok(match, `expected rgba overlay, got ${css}`);
  return Number(match[1]);
}

function rgbChannels(css: string) {
  const match = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  assert.ok(match, `expected rgb color, got ${css}`);
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
}

function hueOf(css: string) {
  const { r, g, b } = rgbChannels(css);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  if (d === 0) return 0;
  let h = 0;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

const empty = tokensFromImageData(makeEmpty());
assert.deepEqual(empty, FALLBACK_CAMPAIGN_HERO_TOKENS);

const bright = tokensFromImageData(makeSolid(245, 236, 220));
const dark = tokensFromImageData(makeSolid(18, 16, 28));
const warm = tokensFromImageData(makeSolid(168, 72, 58));
const cool = tokensFromImageData(makeSolid(36, 62, 118));

assert.ok(overlayAlpha(bright.overlayStart) > overlayAlpha(dark.overlayStart), "bright images need a stronger overlay");
assert.ok(rgbChannels(bright.headingColor).r > 220, "heading stays cream/white on a bright protected overlay");
assert.ok(rgbChannels(dark.headingColor).r > 220, "heading stays light on a dark image");
assert.ok(overlayAlpha(dark.overlayStart) <= 0.55, "dark images must not get a heavy overlay");

const warmHue = hueOf(warm.accentColor);
assert.ok(warmHue < 75 || warmHue > 320, "warm campaign palettes keep warm accents");
assert.ok(rgbChannels(warm.buttonBg).r > rgbChannels(warm.buttonBg).b, "warm images produce a warm CTA");

const coolHue = hueOf(cool.accentColor);
assert.ok(coolHue > 160 && coolHue < 280, "cool images must not be forced into gold");
assert.notEqual(cool.buttonBg, FALLBACK_CAMPAIGN_HERO_TOKENS.buttonBg);

const vars = tokensToCssVars(FALLBACK_CAMPAIGN_HERO_TOKENS);
assert.equal(vars["--hero-heading-color"], FALLBACK_CAMPAIGN_HERO_TOKENS.headingColor);
assert.equal(vars["--hero-accent-color"], FALLBACK_CAMPAIGN_HERO_TOKENS.accentColor);
assert.equal(vars["--hero-overlay-end"], FALLBACK_CAMPAIGN_HERO_TOKENS.overlayEnd);

console.log("campaign-hero-palette: all checks passed");
console.log({
  brightOverlay: overlayAlpha(bright.overlayStart),
  darkOverlay: overlayAlpha(dark.overlayStart),
  warmAccent: warm.accentColor,
  coolAccent: cool.accentColor,
  warmButton: warm.buttonBg,
  coolButton: cool.buttonBg
});
