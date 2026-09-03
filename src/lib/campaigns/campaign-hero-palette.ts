export type CampaignHeroStyleTokens = {
  headingColor: string;
  bodyColor: string;
  accentColor: string;
  buttonBg: string;
  buttonText: string;
  buttonHover: string;
  overlayStart: string;
  overlayMid: string;
  overlayEnd: string;
  contentVeil: string;
};

export const FALLBACK_CAMPAIGN_HERO_TOKENS: CampaignHeroStyleTokens = {
  headingColor: "#FDF8F0",
  bodyColor: "rgba(253, 248, 240, 0.88)",
  accentColor: "#D4A820",
  buttonBg: "#7B0D2B",
  buttonText: "#FFFFFF",
  buttonHover: "#8F1230",
  overlayStart: "rgba(26, 16, 18, 0.72)",
  overlayMid: "rgba(26, 16, 18, 0.22)",
  overlayEnd: "rgba(26, 16, 18, 0)",
  contentVeil: "rgba(18, 10, 12, 0.28)"
};

type Rgb = { r: number; g: number; b: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function srgbToLin(channel: number) {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance({ r, g, b }: Rgb) {
  return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
}

function contrastRatio(a: Rgb, b: Rgb) {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t)
  };
}

function rgbToCss({ r, g, b }: Rgb, alpha = 1) {
  if (alpha >= 1) return `rgb(${r}, ${g}, ${b})`;
  return `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * 1000) / 1000})`;
}

function rgbToHsl({ r, g, b }: Rgb) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let rn = 0;
  let gn = 0;
  let bn = 0;
  if (hp >= 0 && hp < 1) [rn, gn, bn] = [c, x, 0];
  else if (hp < 2) [rn, gn, bn] = [x, c, 0];
  else if (hp < 3) [rn, gn, bn] = [0, c, x];
  else if (hp < 4) [rn, gn, bn] = [0, x, c];
  else if (hp < 5) [rn, gn, bn] = [x, 0, c];
  else [rn, gn, bn] = [c, 0, x];
  const m = l - c / 2;
  return {
    r: Math.round(clamp((rn + m) * 255, 0, 255)),
    g: Math.round(clamp((gn + m) * 255, 0, 255)),
    b: Math.round(clamp((bn + m) * 255, 0, 255))
  };
}

const CREAM: Rgb = { r: 253, g: 248, b: 240 };
const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const MAROON: Rgb = { r: 123, g: 13, b: 43 };
const GOLD: Rgb = { r: 212, g: 168, b: 32 };
const INK: Rgb = { r: 26, g: 16, b: 18 };

function ensureContrast(fg: Rgb, bg: Rgb, minRatio = 4.5): Rgb {
  if (contrastRatio(fg, bg) >= minRatio) return fg;
  if (contrastRatio(CREAM, bg) >= minRatio) return CREAM;
  if (contrastRatio(WHITE, bg) >= minRatio) return WHITE;
  return relativeLuminance(bg) > 0.5 ? INK : WHITE;
}

function liftHueForContrast(color: Rgb, bg: Rgb, minRatio: number): Rgb {
  if (contrastRatio(color, bg) >= minRatio) return color;
  const { h, s } = rgbToHsl(color);
  const sat = Math.max(s, 0.32);
  for (const l of [0.58, 0.66, 0.74, 0.82, 0.9]) {
    const candidate = hslToRgb(h, sat, l);
    if (contrastRatio(candidate, bg) >= minRatio) return candidate;
  }
  return ensureContrast(color, bg, minRatio);
}

function pickReadableOn(bg: Rgb): Rgb {
  return contrastRatio(CREAM, bg) >= contrastRatio(INK, bg) ? CREAM : INK;
}

function darken(rgb: Rgb, amount: number) {
  const { h, s, l } = rgbToHsl(rgb);
  return hslToRgb(h, s, clamp(l * (1 - amount), 0.08, 0.92));
}

function lighten(rgb: Rgb, amount: number) {
  const { h, s, l } = rgbToHsl(rgb);
  return hslToRgb(h, s, clamp(l + (1 - l) * amount, 0.08, 0.94));
}

function isGoldFamily({ h, s, l }: { h: number; s: number; l: number }) {
  return h >= 28 && h <= 58 && s > 0.22 && l > 0.22 && l < 0.82;
}

export function tokensToCssVars(tokens: CampaignHeroStyleTokens): Record<string, string> {
  return {
    "--hero-heading-color": tokens.headingColor,
    "--hero-body-color": tokens.bodyColor,
    "--hero-accent-color": tokens.accentColor,
    "--hero-button-bg": tokens.buttonBg,
    "--hero-button-text": tokens.buttonText,
    "--hero-button-hover": tokens.buttonHover,
    "--hero-overlay-start": tokens.overlayStart,
    "--hero-overlay-mid": tokens.overlayMid,
    "--hero-overlay-end": tokens.overlayEnd,
    "--hero-content-veil": tokens.contentVeil
  };
}

export function tokensFromImageData(imageData: ImageData): CampaignHeroStyleTokens {
  const { data, width, height } = imageData;
  if (!width || !height) return FALLBACK_CAMPAIGN_HERO_TOKENS;

  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>();
  let totalWeight = 0;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let lumSum = 0;
  let lumSq = 0;

  const yStart = Math.floor(height * 0.5);

  for (let y = yStart; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      const a = data[idx + 3];
      if (a < 24) continue;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const xNorm = x / width;
      const yNorm = (y - yStart) / Math.max(1, height - yStart);
      const weight = (xNorm < 0.58 ? 2.1 : 1) * (0.65 + yNorm);
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.count += weight;
        bucket.r += r * weight;
        bucket.g += g * weight;
        bucket.b += b * weight;
      } else {
        buckets.set(key, { count: weight, r: r * weight, g: g * weight, b: b * weight });
      }
      sumR += r * weight;
      sumG += g * weight;
      sumB += b * weight;
      const lum = relativeLuminance({ r, g, b });
      lumSum += lum * weight;
      lumSq += lum * lum * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight < 8) return FALLBACK_CAMPAIGN_HERO_TOKENS;

  const avg: Rgb = {
    r: Math.round(sumR / totalWeight),
    g: Math.round(sumG / totalWeight),
    b: Math.round(sumB / totalWeight)
  };
  const avgLum = lumSum / totalWeight;
  const variance = Math.max(0, lumSq / totalWeight - avgLum * avgLum);
  const busy = Math.sqrt(variance) > 0.12;

  const ranked = [...buckets.values()]
    .map((bucket) => ({
      count: bucket.count,
      rgb: {
        r: Math.round(bucket.r / bucket.count),
        g: Math.round(bucket.g / bucket.count),
        b: Math.round(bucket.b / bucket.count)
      }
    }))
    .sort((a, b) => b.count - a.count);

  let accentSource = GOLD;
  let buttonSource = MAROON;
  let foundAccent = false;
  let foundButton = false;

  for (const entry of ranked.slice(0, 14)) {
    const hsl = rgbToHsl(entry.rgb);
    if (!foundAccent && hsl.s > 0.22 && hsl.l > 0.18 && hsl.l < 0.8) {
      accentSource = entry.rgb;
      foundAccent = true;
    }
    if (!foundButton && hsl.s > 0.18 && hsl.l < 0.42) {
      buttonSource = entry.rgb;
      foundButton = true;
    }
    if (foundAccent && foundButton) break;
  }

  const avgHsl = rgbToHsl(avg);
  if (!foundAccent) {
    accentSource = lighten(avg, 0.28);
    if (isGoldFamily(avgHsl) || ((avgHsl.h < 48 || avgHsl.h > 330) && avgHsl.s > 0.18)) {
      accentSource = mix(accentSource, GOLD, 0.28);
    }
  }
  if (!foundButton) buttonSource = darken(avg, 0.5);

  const accentHsl = rgbToHsl(accentSource);
  const accent = isGoldFamily(accentHsl)
    ? lighten(mix(accentSource, GOLD, 0.18), 0.08)
    : lighten(accentHsl.s < 0.18 ? hslToRgb((avgHsl.h + 28) % 360, 0.42, 0.58) : accentSource, 0.16);

  let overlayAlpha = avgLum > 0.62 ? 0.78 : avgLum > 0.42 ? 0.64 : 0.4;
  if (busy) overlayAlpha = clamp(overlayAlpha + 0.1, 0.42, 0.86);

  const overlayRgb = mix(INK, darken(avg, 0.55), 0.28);
  let effectiveBg = mix(avg, overlayRgb, overlayAlpha);
  if (contrastRatio(CREAM, effectiveBg) < 4.5) {
    overlayAlpha = clamp(overlayAlpha + 0.12, 0.42, 0.9);
    effectiveBg = mix(avg, overlayRgb, overlayAlpha);
  }

  const heading = ensureContrast(CREAM, effectiveBg, 4.5);
  const bodyBase = heading.r > 200 ? mix(heading, { r: 255, g: 236, b: 214 }, 0.12) : heading;
  const body = ensureContrast(bodyBase, effectiveBg, 4.2);
  const accentOnBg = liftHueForContrast(accent, effectiveBg, 3.2);

  let buttonBg = darken(buttonSource, 0.08);
  if (relativeLuminance(buttonBg) > 0.38) buttonBg = darken(buttonBg, 0.35);
  let buttonText = pickReadableOn(buttonBg);
  if (contrastRatio(buttonText, buttonBg) < 4.5) {
    buttonBg = MAROON;
    buttonText = WHITE;
  }
  const buttonHover = lighten(buttonBg, 0.1);

  return {
    headingColor: rgbToCss(heading),
    bodyColor: rgbToCss(body, 0.9),
    accentColor: rgbToCss(accentOnBg),
    buttonBg: rgbToCss(buttonBg),
    buttonText: rgbToCss(buttonText),
    buttonHover: rgbToCss(buttonHover),
    overlayStart: rgbToCss(overlayRgb, overlayAlpha),
    overlayMid: rgbToCss(overlayRgb, overlayAlpha * 0.38),
    overlayEnd: rgbToCss(overlayRgb, 0),
    contentVeil: rgbToCss(overlayRgb, busy ? Math.min(0.42, overlayAlpha * 0.55) : overlayAlpha * 0.32)
  };
}
