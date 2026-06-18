import {
  type ImageSlot,
  isBorderSlot,
  isEmbroiderySlot,
  isFabricSlot,
  slotForIndex
} from "@/config/color-upload-slots";

export type Rgb = { r: number; g: number; b: number };

export type ColorRole = "primary" | "secondary" | "accent";

export type DetectedColor = {
  hex: string;
  rgb: Rgb;
  name: string;
  percent: number;
  role: ColorRole;
  displayLabel: string;
  confidence: number;
  uncertain?: boolean;
};

export type ColorAnalysisSummary = {
  primary: DetectedColor;
  secondary: DetectedColor | null;
  accent: DetectedColor | null;
};

export type ImageExtractionInput = {
  url: string;
  slot?: ImageSlot;
  weight?: number;
};

const FABRIC_PALETTE: { name: string; rgb: Rgb }[] = [
  { name: "Royal Navy Blue", rgb: { r: 25, g: 55, b: 120 } },
  { name: "Navy Blue", rgb: { r: 0, g: 31, b: 91 } },
  { name: "Royal Blue", rgb: { r: 37, g: 99, b: 235 } },
  { name: "Sky Blue", rgb: { r: 125, g: 211, b: 252 } },
  { name: "Rich Red", rgb: { r: 196, g: 30, b: 58 } },
  { name: "Red", rgb: { r: 185, g: 28, b: 28 } },
  { name: "Rose Pink", rgb: { r: 244, g: 114, b: 182 } },
  { name: "Pink", rgb: { r: 236, g: 72, b: 153 } },
  { name: "Maroon", rgb: { r: 127, g: 29, b: 29 } },
  { name: "Emerald Green", rgb: { r: 5, g: 150, b: 105 } },
  { name: "Green", rgb: { r: 22, g: 163, b: 74 } },
  { name: "Teal", rgb: { r: 13, g: 148, b: 136 } },
  { name: "Purple", rgb: { r: 126, g: 34, b: 206 } },
  { name: "Black", rgb: { r: 23, g: 23, b: 23 } },
  { name: "Charcoal", rgb: { r: 55, g: 65, b: 81 } },
  { name: "Cream", rgb: { r: 255, g: 251, b: 235 } },
  { name: "Beige", rgb: { r: 214, g: 188, b: 150 } },
  { name: "Orange", rgb: { r: 234, g: 88, b: 12 } },
  { name: "Brown", rgb: { r: 120, g: 53, b: 15 } }
];

const ZARI_FORBIDDEN = new Set(["Purple", "Wine", "Maroon"]);

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const QUANTIZE_STEP = 32;
const MERGE_DISTANCE = 52;
const BORDER_CONFIDENCE_MIN = 60;
const ZARI_COVERAGE_MIN = 0.05;
const FLOOR_LIKE_NAMES = new Set(["Black", "Charcoal", "Beige", "Brown", "Cream", "White"]);

const paletteCache = new Map<string, DetectedColor[]>();

export function isAcceptedImageType(type: string): boolean {
  return ACCEPTED_TYPES.has(type);
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgb(hex: string): Rgb | null {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return null;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return { r, g, b };
}

function colorDistance(a: Rgb, b: Rgb): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function brightness(r: number, g: number, b: number): number {
  return (r + g + b) / 3;
}

function saturation(r: number, g: number, b: number): number {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function quantize(value: number): number {
  return Math.round(value / QUANTIZE_STEP) * QUANTIZE_STEP;
}

function stableRound(value: number, step = 2): number {
  return Math.round(value / step) * step;
}

function nearestFabricColor(rgb: Rgb): { name: string; hex: string; confidence: number } {
  let best = FABRIC_PALETTE[0];
  let bestDist = Infinity;

  for (const entry of FABRIC_PALETTE) {
    const dist = colorDistance(rgb, entry.rgb);
    if (dist < bestDist) {
      bestDist = dist;
      best = entry;
    }
  }

  const confidence = stableRound(Math.max(0, Math.min(99, 100 - (bestDist / 110) * 100)));
  return { name: best.name, hex: rgbToHex(best.rgb), confidence };
}

function refineFabricName(rgb: Rgb, rawName: string): string {
  const { r, g, b } = rgb;
  const sat = saturation(r, g, b);

  if (b > r + 18 && b > g + 10 && sat > 35) {
    return "Royal Navy Blue";
  }

  if (r > g + 28 && r > b + 28 && sat > 55) {
    if (rawName === "Maroon" || rawName === "Wine") return "Rich Red";
    if (rawName === "Red" || r > 150) return "Rich Red";
  }

  return rawName;
}

function isGlarePixel(r: number, g: number, b: number): boolean {
  return brightness(r, g, b) > 242 && saturation(r, g, b) < 28;
}

function isShadowPixel(r: number, g: number, b: number): boolean {
  return brightness(r, g, b) < 48 && saturation(r, g, b) < 40;
}

function isEdgePixel(x: number, y: number, width: number, height: number): boolean {
  const marginX = width * 0.08;
  const marginY = height * 0.08;
  return x < marginX || x > width - marginX || y < marginY || y > height - marginY;
}

function centerWeight(x: number, y: number, width: number, height: number): number {
  const nx = (x - width / 2) / (width / 2);
  const ny = (y - height / 2) / (height / 2);
  const dist = Math.sqrt(nx * nx + ny * ny);
  if (dist > 1.05) return 0;
  return 2.1 - dist * 1.0;
}

function borderRegionWeight(x: number, y: number, width: number, height: number): number {
  const margin = 0.14;
  const nearEdge =
    x < width * margin ||
    x > width * (1 - margin) ||
    y < height * margin ||
    y > height * (1 - margin);
  return nearEdge ? 2.4 : 0.25;
}

function detectEdgeBackground(data: Uint8ClampedArray, width: number, height: number): Rgb | null {
  const edgeBuckets = new Map<string, { rgb: Rgb; count: number }>();

  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      if (!isEdgePixel(x, y, width, height)) continue;
      const i = (y * width + x) * 4;
      const rgb = { r: quantize(data[i]), g: quantize(data[i + 1]), b: quantize(data[i + 2]) };
      const key = `${rgb.r},${rgb.g},${rgb.b}`;
      const existing = edgeBuckets.get(key);
      if (existing) existing.count += 1;
      else edgeBuckets.set(key, { rgb, count: 1 });
    }
  }

  return [...edgeBuckets.values()].sort((a, b) => b.count - a.count)[0]?.rgb ?? null;
}

function isBackgroundPixel(
  r: number,
  g: number,
  b: number,
  background: Rgb | null,
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  const sat = saturation(r, g, b);
  const bright = brightness(r, g, b);

  if (isGlarePixel(r, g, b) || isShadowPixel(r, g, b)) return true;
  if (background && colorDistance({ r, g, b }, background) < 38) return true;
  if (bright > 228 && sat < 22) return true;

  const isFloorTone =
    sat < 45 &&
    r > 95 &&
    g > 80 &&
    b > 60 &&
    Math.abs(r - g) < 35 &&
    isEdgePixel(x, y, width, height);
  return isFloorTone;
}

function channelSpread(r: number, g: number, b: number): number {
  return Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
}

function isSilverZariPixel(r: number, g: number, b: number): boolean {
  const spread = channelSpread(r, g, b);
  const sat = saturation(r, g, b);
  const bright = brightness(r, g, b);
  return spread < 38 && bright > 125 && sat < 65;
}

function isGoldZariPixel(r: number, g: number, b: number): boolean {
  const sat = saturation(r, g, b);
  const bright = brightness(r, g, b);

  if (r > 158 && g > 125 && b < 145 && sat > 28 && sat < 130) return true;
  if (r > 130 && g > 95 && b < 130 && r > g + 8 && g > b + 4 && sat > 18) return true;
  if (r > 170 && g > 135 && b < 115 && bright > 135) return true;

  return false;
}

function isRoseGoldZariPixel(r: number, g: number, b: number): boolean {
  return r > 175 && g > 115 && b > 95 && r > g && g >= b - 15;
}

function isCopperZariPixel(r: number, g: number, b: number): boolean {
  return r > 150 && g > 75 && g < 130 && b < 85 && r > g + 25;
}

function isZariPixel(r: number, g: number, b: number): boolean {
  return (
    isSilverZariPixel(r, g, b) ||
    isGoldZariPixel(r, g, b) ||
    isRoseGoldZariPixel(r, g, b) ||
    isCopperZariPixel(r, g, b)
  );
}

function isMetallicFabricContaminant(r: number, g: number, b: number): boolean {
  if (isZariPixel(r, g, b)) return true;
  const sat = saturation(r, g, b);
  return r > 125 && g > 95 && b < 125 && r > g + 6 && sat > 14;
}

function classifyZari(rgb: Rgb, metallicWeight = 0): { name: string; confidence: number } {
  const { r, g, b } = rgb;
  const spread = channelSpread(r, g, b);
  const bright = brightness(r, g, b);
  const boost = metallicWeight > 0.15 ? 8 : metallicWeight > 0.08 ? 5 : 0;

  if (isSilverZariPixel(r, g, b)) {
    return {
      name: "Silver Zari",
      confidence: stableRound(Math.min(99, 78 + boost + (bright > 170 ? 6 : 0)))
    };
  }

  if (isGoldZariPixel(r, g, b)) {
    return {
      name: "Gold Zari",
      confidence: stableRound(Math.min(99, 80 + boost))
    };
  }

  if (isRoseGoldZariPixel(r, g, b)) {
    return {
      name: "Rose Gold Zari",
      confidence: stableRound(Math.min(99, 76 + boost))
    };
  }

  if (isCopperZariPixel(r, g, b)) {
    return {
      name: "Copper Zari",
      confidence: stableRound(Math.min(99, 74 + boost))
    };
  }

  const fabricNearest = nearestFabricColor(rgb);
  if (ZARI_FORBIDDEN.has(fabricNearest.name)) {
    if (spread < 42 && bright > 130) {
      return { name: "Silver Zari", confidence: stableRound(72 + boost) };
    }
    return { name: "Gold Zari", confidence: stableRound(72 + boost) };
  }

  if (spread < 35 && bright > 140) {
    return { name: "Silver Zari", confidence: stableRound(70 + boost) };
  }

  return { name: "Gold Zari", confidence: stableRound(70 + boost) };
}

type WeightedBucket = { rgb: Rgb; weight: number };

function mergeBuckets(buckets: WeightedBucket[]): WeightedBucket[] {
  const merged: WeightedBucket[] = [];

  for (const entry of buckets) {
    const similar = merged.find((m) => colorDistance(m.rgb, entry.rgb) < MERGE_DISTANCE);
    if (similar) similar.weight += entry.weight;
    else merged.push({ ...entry });
  }

  return merged.sort((a, b) => b.weight - a.weight);
}

type PixelContext = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  background: Rgb | null;
};

type AnalysisMode = "fabric" | "border" | "embroidery" | "zari-global";

function collectPixels(ctx: PixelContext, mode: AnalysisMode, imageWeight: number): WeightedBucket[] {
  const { data, width, height, background } = ctx;
  const buckets: WeightedBucket[] = [];

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 128) continue;
      if (isBackgroundPixel(r, g, b, background, x, y, width, height)) continue;

      const rgb = { r: quantize(r), g: quantize(g), b: quantize(b) };
      const zari = isZariPixel(r, g, b);

      if (mode === "fabric") {
        if (isMetallicFabricContaminant(r, g, b)) continue;
        const spatial = centerWeight(x, y, width, height);
        if (spatial <= 0.2) continue;
        buckets.push({ rgb, weight: spatial * imageWeight });
        continue;
      }

      if (mode === "border") {
        if (!zari) continue;
        const edge = borderRegionWeight(x, y, width, height);
        buckets.push({ rgb, weight: Math.max(edge, 0.85) * imageWeight * 1.3 });
        continue;
      }

      if (mode === "embroidery") {
        if (!zari) continue;
        buckets.push({ rgb, weight: imageWeight * 1.5 });
        continue;
      }

      if (mode === "zari-global") {
        if (!zari) continue;
        const edge = borderRegionWeight(x, y, width, height);
        buckets.push({ rgb, weight: Math.max(edge, 1) * imageWeight });
      }
    }
  }

  return buckets;
}

type ZariCoverage = {
  share: number;
  buckets: WeightedBucket[];
  goldVotes: number;
  silverVotes: number;
};

function measureZariCoverage(ctx: PixelContext, imageWeight = 1): ZariCoverage {
  const { data, width, height, background } = ctx;
  const buckets: WeightedBucket[] = [];
  let validPixels = 0;
  let zariPixels = 0;
  let goldVotes = 0;
  let silverVotes = 0;

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 128) continue;
      if (isBackgroundPixel(r, g, b, background, x, y, width, height)) continue;

      validPixels += 1;
      if (!isZariPixel(r, g, b)) continue;

      zariPixels += 1;
      const rgb = { r: quantize(r), g: quantize(g), b: quantize(b) };
      const edge = borderRegionWeight(x, y, width, height);
      buckets.push({ rgb, weight: Math.max(edge, 1) * imageWeight });

      if (isSilverZariPixel(r, g, b)) silverVotes += 1;
      else goldVotes += 1;
    }
  }

  return {
    share: validPixels > 0 ? zariPixels / validPixels : 0,
    buckets,
    goldVotes,
    silverVotes
  };
}

async function loadImageContext(imageUrl: string, sampleMax = 400): Promise<PixelContext & { fingerprint: string }> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not load image for analysis."));
    el.src = imageUrl;
  });

  const scale = Math.min(1, sampleMax / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not analyze image.");

  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);

  return {
    data: imageData.data,
    width,
    height,
    background: detectEdgeBackground(imageData.data, width, height),
    fingerprint: fingerprintImageData(imageData.data, width, height)
  };
}

function fingerprintImageData(data: Uint8ClampedArray, width: number, height: number): string {
  let hash = 0;
  const step = Math.max(4, Math.floor((width * height) / 800));
  for (let i = 0; i < data.length; i += step * 4) {
    hash = (hash * 31 + data[i] + data[i + 1] + data[i + 2]) % 1_000_000_007;
  }
  return `${width}x${height}-${hash}`;
}

function analyzeFabric(buckets: WeightedBucket[]): DetectedColor | null {
  if (!buckets.length) return null;

  const merged = mergeBuckets(buckets);
  const total = merged.reduce((s, b) => s + b.weight, 0);

  for (const entry of merged) {
    const { r, g, b } = entry.rgb;
    if (isMetallicFabricContaminant(r, g, b)) continue;

    const named = nearestFabricColor(entry.rgb);
    if (FLOOR_LIKE_NAMES.has(named.name)) {
      const sat = saturation(r, g, b);
      if (sat < 40 && entry.weight / total < 0.5) continue;
    }

    const name = refineFabricName(entry.rgb, named.name);
    const confidence = stableRound(Math.max(named.confidence, 72));
    const percent = stableRound((entry.weight / total) * 100, 5);

    return {
      hex: rgbToHex(entry.rgb),
      rgb: entry.rgb,
      name,
      percent: Math.max(percent, 20),
      role: "primary",
      displayLabel: "Primary Saree Color",
      confidence
    };
  }

  return null;
}

function resolveZariName(
  rgb: Rgb,
  pixelShare: number,
  goldVotes: number,
  silverVotes: number
): { name: string; confidence: number } {
  const classified = classifyZari(rgb, pixelShare);
  const coverageBoost = pixelShare >= ZARI_COVERAGE_MIN ? Math.min(12, (pixelShare - ZARI_COVERAGE_MIN) * 80) : 0;

  if (goldVotes > silverVotes * 1.15) {
    return {
      name: classified.name.includes("Silver") ? "Gold Zari" : classified.name,
      confidence: stableRound(Math.min(99, Math.max(classified.confidence, 68) + coverageBoost))
    };
  }

  if (silverVotes > goldVotes * 1.15) {
    return {
      name: classified.name.includes("Gold") || classified.name.includes("Copper") || classified.name.includes("Rose")
        ? "Silver Zari"
        : classified.name,
      confidence: stableRound(Math.min(99, Math.max(classified.confidence, 68) + coverageBoost))
    };
  }

  return {
    name: classified.name,
    confidence: stableRound(Math.min(99, classified.confidence + coverageBoost))
  };
}

function analyzeZari(
  buckets: WeightedBucket[],
  displayLabel: string,
  role: ColorRole,
  pixelShare = 0,
  goldVotes = 0,
  silverVotes = 0
): DetectedColor | null {
  if (!buckets.length) return null;

  if (pixelShare < ZARI_COVERAGE_MIN) return null;

  const merged = mergeBuckets(buckets);
  const total = merged.reduce((s, b) => s + b.weight, 0);
  const top = merged[0];
  if (!top) return null;

  const bucketShare = top.weight / total;
  const classified = resolveZariName(top.rgb, Math.max(pixelShare, bucketShare), goldVotes, silverVotes);
  const confidence = stableRound(classified.confidence);

  if (confidence < BORDER_CONFIDENCE_MIN) {
    return {
      hex: rgbToHex(top.rgb),
      rgb: top.rgb,
      name: "Border color not confidently detected",
      percent: stableRound(pixelShare * 100, 5),
      role,
      displayLabel,
      confidence,
      uncertain: true
    };
  }

  return {
    hex: blouseHexForName(classified.name),
    rgb: top.rgb,
    name: classified.name,
    percent: stableRound(Math.max(pixelShare * 100, bucketShare * 100, 5), 5),
    role,
    displayLabel,
    confidence
  };
}

function buildAccentFromZari(zari: DetectedColor | null): DetectedColor | null {
  if (!zari || zari.uncertain) return null;

  const accentMap: Record<string, string> = {
    "Silver Zari": "Silver Highlights",
    "Gold Zari": "Gold Highlights",
    "Rose Gold Zari": "Rose Gold Highlights",
    "Copper Zari": "Copper Highlights"
  };

  const accentName = accentMap[zari.name];
  if (!accentName) return null;

  return {
    hex: blouseHexForName(accentName),
    rgb: zari.rgb,
    name: accentName,
    percent: stableRound(Math.max(8, zari.percent - 10), 5),
    role: "accent",
    displayLabel: "Accent Tone",
    confidence: stableRound(Math.max(70, zari.confidence - 6))
  };
}

export async function compressImageFile(
  file: File,
  maxDimension = 1600,
  quality = 0.88
): Promise<Blob> {
  if (!isAcceptedImageType(file.type)) {
    throw new Error("Please upload JPG, PNG, or WEBP images.");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("Could not process image.");

  c.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Compression failed."))),
      mime,
      quality
    );
  });
}

function normalizeInputs(inputs: string[] | ImageExtractionInput[]): ImageExtractionInput[] {
  return inputs.map((item, index) => {
    if (typeof item === "string") {
      return { url: item, slot: slotForIndex(index), weight: index === 0 ? 0.7 : 1.3 };
    }
    return {
      url: item.url,
      slot: item.slot ?? slotForIndex(index),
      weight: item.weight ?? (index === 0 ? 0.7 : 1.3)
    };
  });
}

export async function extractColorsFromImages(
  inputs: string[] | ImageExtractionInput[]
): Promise<DetectedColor[]> {
  const normalized = normalizeInputs(inputs);
  const cacheKey = normalized.map((i) => `${i.url}|${i.slot}|${i.weight}`).join("::");
  const cached = paletteCache.get(cacheKey);
  if (cached) return cached;

  const contexts = await Promise.all(normalized.map((i) => loadImageContext(i.url)));

  const fabricBuckets: WeightedBucket[] = [];
  const zariBuckets: WeightedBucket[] = [];
  let maxZariShare = 0;
  let totalGoldVotes = 0;
  let totalSilverVotes = 0;

  normalized.forEach((input, index) => {
    const ctx = contexts[index];
    const slot = input.slot ?? slotForIndex(index);
    const weight = input.weight ?? 1;

    if (isFabricSlot(slot) || normalized.length === 1) {
      fabricBuckets.push(...collectPixels(ctx, "fabric", weight));
    }

    const coverage = measureZariCoverage(ctx, weight);
    maxZariShare = Math.max(maxZariShare, coverage.share);
    totalGoldVotes += coverage.goldVotes;
    totalSilverVotes += coverage.silverVotes;

    if (coverage.share >= ZARI_COVERAGE_MIN) {
      zariBuckets.push(...coverage.buckets);
    }

    zariBuckets.push(...collectPixels(ctx, "zari-global", weight));

    if (isBorderSlot(slot)) {
      zariBuckets.push(...collectPixels(ctx, "border", weight * 1.2));
    }

    if (isEmbroiderySlot(slot)) {
      zariBuckets.push(...collectPixels(ctx, "embroidery", weight * 1.25));
    }
  });

  if (!fabricBuckets.length) {
    normalized.forEach((input, index) => {
      if (!isFabricSlot(input.slot ?? slotForIndex(index))) {
        fabricBuckets.push(...collectPixels(contexts[index], "fabric", (input.weight ?? 1) * 0.5));
      }
    });
  }

  const primary = analyzeFabric(fabricBuckets);
  const border = analyzeZari(
    zariBuckets,
    "Border / Embroidery",
    "secondary",
    maxZariShare,
    totalGoldVotes,
    totalSilverVotes
  );
  const accent = buildAccentFromZari(border);

  const colors = [primary, border, accent].filter(Boolean) as DetectedColor[];
  paletteCache.set(cacheKey, colors);
  return colors;
}

export async function extractColorsFromImageUrl(
  imageUrl: string,
  weight = 1
): Promise<DetectedColor[]> {
  return extractColorsFromImages([{ url: imageUrl, slot: "full-saree", weight }]);
}

export function buildAnalysisSummary(detectedColors: DetectedColor[]): ColorAnalysisSummary {
  const primary = detectedColors.find((c) => c.role === "primary") ?? detectedColors[0];
  const secondary = detectedColors.find((c) => c.role === "secondary") ?? null;
  const accent = detectedColors.find((c) => c.role === "accent") ?? null;

  if (!primary) {
    throw new Error("No colors detected in the uploaded images.");
  }

  return { primary, secondary, accent };
}

export function blouseHexForName(name: string): string {
  const palette: Record<string, Rgb> = {
    "Royal Navy Blue": { r: 25, g: 55, b: 120 },
    "Navy Blue": { r: 0, g: 31, b: 91 },
    "Rich Red": { r: 196, g: 30, b: 58 },
    Red: { r: 185, g: 28, b: 28 },
    "Emerald Green": { r: 5, g: 150, b: 105 },
    Green: { r: 22, g: 163, b: 74 },
    "Silver Zari": { r: 198, g: 200, b: 205 },
    "Gold Zari": { r: 210, g: 180, b: 70 },
    "Rose Gold Zari": { r: 214, g: 165, b: 130 },
    "Copper Zari": { r: 184, g: 115, b: 51 },
    Gold: { r: 212, g: 175, b: 55 },
    Silver: { r: 192, g: 192, b: 192 },
    Maroon: { r: 127, g: 29, b: 29 },
    Wine: { r: 114, g: 47, b: 55 },
    Pink: { r: 236, g: 72, b: 153 },
    "Magenta Pink": { r: 219, g: 39, b: 119 },
    Black: { r: 23, g: 23, b: 23 },
    Cream: { r: 255, g: 251, b: 235 },
    Beige: { r: 214, g: 188, b: 150 },
    Brown: { r: 120, g: 53, b: 15 }
  };

  const match = palette[name];
  if (match) return rgbToHex(match);
  if (name === "Silver Highlights") return rgbToHex({ r: 214, g: 216, b: 220 });
  if (name === "Gold Highlights") return rgbToHex({ r: 228, g: 198, b: 90 });
  if (name === "Rose Gold Highlights") return rgbToHex({ r: 230, g: 190, b: 160 });
  if (name === "Copper Highlights") return rgbToHex({ r: 200, g: 140, b: 70 });
  return nearestFabricColor({ r: 128, g: 128, b: 128 }).hex;
}

export function nearestNamedColor(rgb: Rgb): { name: string; hex: string; confidence: number } {
  return nearestFabricColor(rgb);
}

export function clearPaletteCache(): void {
  paletteCache.clear();
}
