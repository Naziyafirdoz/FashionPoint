export const CAMPAIGN_FONT_FAMILIES = ["playfair", "inter", "georgia", "system"] as const;
export const CAMPAIGN_HEADING_SIZES = ["sm", "md", "lg", "xl"] as const;
export const CAMPAIGN_TEXT_SIZES = ["sm", "md", "lg"] as const;
export const CAMPAIGN_FONT_WEIGHTS = ["normal", "semibold", "bold"] as const;
export const CAMPAIGN_FONT_STYLES = ["normal", "italic"] as const;
export const CAMPAIGN_ALIGNMENTS = ["left", "center", "right"] as const;
export const CAMPAIGN_SIZE_UNITS = ["px", "rem"] as const;
export const CAMPAIGN_CUSTOM_OPTION = "custom" as const;

export type CampaignFontFamily = (typeof CAMPAIGN_FONT_FAMILIES)[number];
export type CampaignHeadingSize = (typeof CAMPAIGN_HEADING_SIZES)[number];
export type CampaignTextSize = (typeof CAMPAIGN_TEXT_SIZES)[number];
export type CampaignFontWeight = (typeof CAMPAIGN_FONT_WEIGHTS)[number];
export type CampaignFontStyle = (typeof CAMPAIGN_FONT_STYLES)[number];
export type CampaignContentAlign = (typeof CAMPAIGN_ALIGNMENTS)[number];
export type CampaignSizeUnit = (typeof CAMPAIGN_SIZE_UNITS)[number];
export type CampaignFontFamilyChoice = CampaignFontFamily | typeof CAMPAIGN_CUSTOM_OPTION;
export type CampaignHeadingSizeChoice = CampaignHeadingSize | typeof CAMPAIGN_CUSTOM_OPTION;
export type CampaignTextSizeChoice = CampaignTextSize | typeof CAMPAIGN_CUSTOM_OPTION;
export type CampaignFontWeightChoice = CampaignFontWeight | typeof CAMPAIGN_CUSTOM_OPTION;

export type CampaignCustomSize = {
  value: number;
  unit: CampaignSizeUnit;
};

export type CampaignContentStyle = {
  heading: {
    fontFamily: CampaignFontFamilyChoice;
    customFontFamily?: string;
    fontSize: CampaignHeadingSizeChoice;
    customFontSize?: CampaignCustomSize;
    fontWeight: CampaignFontWeightChoice;
    customFontWeight?: number;
    fontStyle: CampaignFontStyle;
    color: string;
  };
  subheading: {
    fontFamily: CampaignFontFamilyChoice;
    customFontFamily?: string;
    fontSize: CampaignTextSizeChoice;
    customFontSize?: CampaignCustomSize;
    color: string;
  };
  offer: {
    fontFamily: CampaignFontFamilyChoice;
    customFontFamily?: string;
    fontSize: CampaignTextSizeChoice;
    customFontSize?: CampaignCustomSize;
    color: string;
  };
  cta: {
    backgroundColor: string;
    textColor: string;
  };
  layout: {
    horizontalAlign: CampaignContentAlign;
  };
  overlay: {
    enabled: boolean;
    color: string;
    opacity: number;
  };
};

export const DEFAULT_CAMPAIGN_CONTENT_STYLE: CampaignContentStyle = {
  heading: {
    fontFamily: "playfair",
    fontSize: "lg",
    fontWeight: "semibold",
    fontStyle: "normal",
    color: "#FDF8F0"
  },
  subheading: {
    fontFamily: "inter",
    fontSize: "md",
    color: "#FDF8F0"
  },
  offer: {
    fontFamily: "inter",
    fontSize: "sm",
    color: "#D4A820"
  },
  cta: {
    backgroundColor: "#7B0D2B",
    textColor: "#FFFFFF"
  },
  layout: {
    horizontalAlign: "left"
  },
  overlay: {
    enabled: true,
    color: "#1A1012",
    opacity: 0.72
  }
};

export const DEFAULT_CUSTOM_HEADING_SIZE: CampaignCustomSize = { value: 52, unit: "px" };
export const DEFAULT_CUSTOM_TEXT_SIZE: CampaignCustomSize = { value: 1, unit: "rem" };
export const DEFAULT_CUSTOM_FONT_WEIGHT = 500;

const FONT_STACK: Record<CampaignFontFamily, string> = {
  playfair: "var(--font-display), Georgia, serif",
  inter: "var(--font-sans), system-ui, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
  system: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
};

const HEADING_SIZE: Record<CampaignHeadingSize, string> = {
  sm: "clamp(1.5rem, 2.8vw, 2.25rem)",
  md: "clamp(1.75rem, 3.4vw, 2.75rem)",
  lg: "clamp(1.875rem, 4vw, 3.35rem)",
  xl: "clamp(2.15rem, 5vw, 4rem)"
};

const BODY_SIZE: Record<CampaignTextSize, string> = {
  sm: "0.875rem",
  md: "1rem",
  lg: "1.125rem"
};

const OFFER_SIZE: Record<CampaignTextSize, string> = {
  sm: "0.68rem",
  md: "0.75rem",
  lg: "0.875rem"
};

const WEIGHT_VALUE: Record<CampaignFontWeight, string> = {
  normal: "400",
  semibold: "600",
  bold: "700"
};

const FONT_SET = new Set<string>(CAMPAIGN_FONT_FAMILIES);
const HEADING_SIZE_SET = new Set<string>(CAMPAIGN_HEADING_SIZES);
const TEXT_SIZE_SET = new Set<string>(CAMPAIGN_TEXT_SIZES);
const WEIGHT_SET = new Set<string>(CAMPAIGN_FONT_WEIGHTS);
const STYLE_SET = new Set<string>(CAMPAIGN_FONT_STYLES);
const ALIGN_SET = new Set<string>(CAMPAIGN_ALIGNMENTS);
const GENERIC_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-sans-serif",
  "ui-serif"
]);

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const RGB_RE =
  /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i;
const FONT_NAME_RE = /^[a-zA-Z][a-zA-Z0-9 \-]*$/;
const FONT_INJECTION = [
  "url(",
  "@import",
  "var(",
  "javascript:",
  "data:",
  "expression",
  ";",
  "{",
  "}",
  "<",
  ">",
  "\\",
  "/",
  "="
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asEnum<T extends string>(value: unknown, allowed: Set<string>): T | null {
  return typeof value === "string" && allowed.has(value) ? (value as T) : null;
}

function channelOk(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 255;
}

function toHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

export function parseSafeColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 32) return null;
  const lower = trimmed.toLowerCase();
  if (lower.includes("url(") || lower.includes("expression") || lower.includes("javascript")) {
    return null;
  }
  if (HEX_RE.test(trimmed)) {
    if (trimmed.length === 4) {
      const r = trimmed[1];
      const g = trimmed[2];
      const b = trimmed[3];
      return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
    }
    return trimmed.toUpperCase();
  }
  const rgb = trimmed.match(RGB_RE);
  if (!rgb) return null;
  const r = Number(rgb[1]);
  const g = Number(rgb[2]);
  const b = Number(rgb[3]);
  if (!channelOk(r) || !channelOk(g) || !channelOk(b)) return null;
  return toHex(r, g, b);
}

export function parseSafeFontFamily(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.length > 80) return null;
  const lower = trimmed.toLowerCase();
  if (FONT_INJECTION.some((token) => lower.includes(token))) return null;
  const parts = trimmed.split(",").map((part) => part.trim());
  if (parts.length === 0 || parts.length > 4 || parts.some((part) => !part)) return null;

  for (const part of parts) {
    let name = part;
    if (
      (name.startsWith('"') && name.endsWith('"') && name.length >= 2) ||
      (name.startsWith("'") && name.endsWith("'") && name.length >= 2)
    ) {
      name = name.slice(1, -1).trim();
    }
    if (!name || name.length > 40) return null;
    if (GENERIC_FAMILIES.has(name.toLowerCase())) continue;
    if (!FONT_NAME_RE.test(name)) return null;
  }

  return trimmed;
}

export function parseCustomFontSize(value: unknown): CampaignCustomSize | null {
  if (!isRecord(value)) return null;
  const unit = value.unit === "px" || value.unit === "rem" ? value.unit : null;
  const raw = typeof value.value === "number" ? value.value : Number(value.value);
  if (!unit || !Number.isFinite(raw) || raw <= 0) return null;
  const rounded = Math.round(raw * 100) / 100;
  if (unit === "px" && (rounded < 12 || rounded > 160)) return null;
  if (unit === "rem" && (rounded < 0.75 || rounded > 10)) return null;
  return { value: rounded, unit };
}

export function parseCustomFontWeight(value: unknown): number | null {
  const raw = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(raw) || raw < 100 || raw > 900 || raw % 100 !== 0) return null;
  return raw;
}

export function parseOverlayOpacity(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0 || value > 1) return null;
  return Math.round(value * 100) / 100;
}

function parseFontFamilyChoice(
  value: unknown,
  customValue: unknown
): { fontFamily: CampaignFontFamilyChoice; customFontFamily?: string } | null {
  if (value === CAMPAIGN_CUSTOM_OPTION) {
    const customFontFamily = parseSafeFontFamily(customValue);
    if (!customFontFamily) return null;
    return { fontFamily: CAMPAIGN_CUSTOM_OPTION, customFontFamily };
  }
  const fontFamily = asEnum<CampaignFontFamily>(value, FONT_SET);
  if (!fontFamily) return null;
  return { fontFamily };
}

function parseHeadingSizeChoice(
  value: unknown,
  customValue: unknown
): { fontSize: CampaignHeadingSizeChoice; customFontSize?: CampaignCustomSize } | null {
  if (value === CAMPAIGN_CUSTOM_OPTION) {
    const customFontSize = parseCustomFontSize(customValue);
    if (!customFontSize) return null;
    return { fontSize: CAMPAIGN_CUSTOM_OPTION, customFontSize };
  }
  const fontSize = asEnum<CampaignHeadingSize>(value, HEADING_SIZE_SET);
  if (!fontSize) return null;
  return { fontSize };
}

function parseTextSizeChoice(
  value: unknown,
  customValue: unknown
): { fontSize: CampaignTextSizeChoice; customFontSize?: CampaignCustomSize } | null {
  if (value === CAMPAIGN_CUSTOM_OPTION) {
    const customFontSize = parseCustomFontSize(customValue);
    if (!customFontSize) return null;
    return { fontSize: CAMPAIGN_CUSTOM_OPTION, customFontSize };
  }
  const fontSize = asEnum<CampaignTextSize>(value, TEXT_SIZE_SET);
  if (!fontSize) return null;
  return { fontSize };
}

function parseWeightChoice(
  value: unknown,
  customValue: unknown
): { fontWeight: CampaignFontWeightChoice; customFontWeight?: number } | null {
  if (value === CAMPAIGN_CUSTOM_OPTION) {
    const customFontWeight = parseCustomFontWeight(customValue);
    if (customFontWeight == null) return null;
    return { fontWeight: CAMPAIGN_CUSTOM_OPTION, customFontWeight };
  }
  const fontWeight = asEnum<CampaignFontWeight>(value, WEIGHT_SET);
  if (!fontWeight) return null;
  return { fontWeight };
}

function lightenHex(hex: string, amount: number) {
  const raw = hex.replace("#", "");
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  return toHex(mix(r), mix(g), mix(b));
}

function hexToRgb(hex: string) {
  const raw = hex.replace("#", "");
  return {
    r: Number.parseInt(raw.slice(0, 2), 16),
    g: Number.parseInt(raw.slice(2, 4), 16),
    b: Number.parseInt(raw.slice(4, 6), 16)
  };
}

function parseHeading(value: unknown): CampaignContentStyle["heading"] | null {
  if (!isRecord(value)) return null;
  const family = parseFontFamilyChoice(value.fontFamily, value.customFontFamily);
  const size = parseHeadingSizeChoice(value.fontSize, value.customFontSize);
  const weight = parseWeightChoice(value.fontWeight, value.customFontWeight);
  const fontStyle = asEnum<CampaignFontStyle>(value.fontStyle, STYLE_SET);
  const color = parseSafeColor(value.color);
  if (!family || !size || !weight || !fontStyle || !color) return null;
  return { ...family, ...size, ...weight, fontStyle, color };
}

function parseTextBlock(value: unknown): CampaignContentStyle["subheading"] | null {
  if (!isRecord(value)) return null;
  const family = parseFontFamilyChoice(value.fontFamily, value.customFontFamily);
  const size = parseTextSizeChoice(value.fontSize, value.customFontSize);
  const color = parseSafeColor(value.color);
  if (!family || !size || !color) return null;
  return { ...family, ...size, color };
}

function parseCta(value: unknown): CampaignContentStyle["cta"] | null {
  if (!isRecord(value)) return null;
  const backgroundColor = parseSafeColor(value.backgroundColor);
  const textColor = parseSafeColor(value.textColor);
  if (!backgroundColor || !textColor) return null;
  return { backgroundColor, textColor };
}

function parseLayout(value: unknown): CampaignContentStyle["layout"] | null {
  if (!isRecord(value)) return null;
  const horizontalAlign = asEnum<CampaignContentAlign>(value.horizontalAlign, ALIGN_SET);
  if (!horizontalAlign) return null;
  return { horizontalAlign };
}

function parseOverlay(value: unknown): CampaignContentStyle["overlay"] | null {
  if (!isRecord(value)) return null;
  if (typeof value.enabled !== "boolean") return null;
  const color = parseSafeColor(value.color);
  const opacity = parseOverlayOpacity(value.opacity);
  if (!color || opacity == null) return null;
  return { enabled: value.enabled, color, opacity };
}

export function parseCampaignContentStyle(value: unknown): CampaignContentStyle | null {
  if (value == null) return null;
  if (!isRecord(value)) return null;
  const heading = parseHeading(value.heading);
  const subheading = parseTextBlock(value.subheading);
  const offer = parseTextBlock(value.offer);
  const cta = parseCta(value.cta);
  const layout = parseLayout(value.layout);
  const overlay = parseOverlay(value.overlay);
  if (!heading || !subheading || !offer || !cta || !layout || !overlay) return null;
  return { heading, subheading, offer, cta, layout, overlay };
}

export function parseCampaignContentStyleForAdmin(
  value: unknown
): { ok: true; style: CampaignContentStyle | null } | { ok: false; error: string } {
  if (value == null) return { ok: true, style: null };
  const parsed = parseCampaignContentStyle(value);
  if (!parsed) {
    return { ok: false, error: "contentStyle contains invalid or unsupported values" };
  }
  return { ok: true, style: parsed };
}

function resolveFontFamily(family: CampaignFontFamilyChoice, custom?: string) {
  if (family === CAMPAIGN_CUSTOM_OPTION) {
    return parseSafeFontFamily(custom) ?? FONT_STACK.georgia;
  }
  return FONT_STACK[family];
}

function resolveSize(
  size: string,
  custom: CampaignCustomSize | undefined,
  presets: Record<string, string>
) {
  if (size === CAMPAIGN_CUSTOM_OPTION) {
    const parsed = parseCustomFontSize(custom);
    if (parsed) return `${parsed.value}${parsed.unit}`;
    return presets.lg ?? presets.md;
  }
  return presets[size] ?? presets.lg ?? presets.md;
}

function resolveWeight(weight: CampaignFontWeightChoice, custom?: number) {
  if (weight === CAMPAIGN_CUSTOM_OPTION) {
    const parsed = parseCustomFontWeight(custom);
    if (parsed != null) return String(parsed);
    return WEIGHT_VALUE.semibold;
  }
  return WEIGHT_VALUE[weight];
}

export function contentStyleToCssVars(style: CampaignContentStyle): Record<string, string> {
  const overlayRgb = hexToRgb(style.overlay.color);
  const overlayAlpha = style.overlay.enabled ? style.overlay.opacity : 0;
  return {
    "--hero-heading-font": resolveFontFamily(style.heading.fontFamily, style.heading.customFontFamily),
    "--hero-heading-size": resolveSize(style.heading.fontSize, style.heading.customFontSize, HEADING_SIZE),
    "--hero-heading-weight": resolveWeight(style.heading.fontWeight, style.heading.customFontWeight),
    "--hero-heading-style": style.heading.fontStyle,
    "--hero-heading-color": style.heading.color,
    "--hero-subheading-font": resolveFontFamily(style.subheading.fontFamily, style.subheading.customFontFamily),
    "--hero-subheading-size": resolveSize(
      style.subheading.fontSize,
      style.subheading.customFontSize,
      BODY_SIZE
    ),
    "--hero-subheading-color": style.subheading.color,
    "--hero-offer-font": resolveFontFamily(style.offer.fontFamily, style.offer.customFontFamily),
    "--hero-offer-size": resolveSize(style.offer.fontSize, style.offer.customFontSize, OFFER_SIZE),
    "--hero-offer-color": style.offer.color,
    "--hero-accent-color": style.offer.color,
    "--hero-body-color": style.subheading.color,
    "--hero-button-bg": style.cta.backgroundColor,
    "--hero-button-text": style.cta.textColor,
    "--hero-button-hover": lightenHex(style.cta.backgroundColor, 0.1),
    "--hero-overlay-start": `rgba(${overlayRgb.r}, ${overlayRgb.g}, ${overlayRgb.b}, ${overlayAlpha})`,
    "--hero-overlay-mid": `rgba(${overlayRgb.r}, ${overlayRgb.g}, ${overlayRgb.b}, ${overlayAlpha * 0.38})`,
    "--hero-overlay-end": `rgba(${overlayRgb.r}, ${overlayRgb.g}, ${overlayRgb.b}, 0)`,
    "--hero-content-veil": `rgba(${overlayRgb.r}, ${overlayRgb.g}, ${overlayRgb.b}, ${
      style.overlay.enabled ? Math.min(0.42, overlayAlpha * 0.45) : 0
    })`
  };
}

type PaletteLike = {
  headingColor: string;
  bodyColor: string;
  accentColor: string;
  buttonBg: string;
  buttonText: string;
  overlayStart: string;
};

function colorFromCss(value: string, fallback: string) {
  return parseSafeColor(value) ?? fallback;
}

export function contentStyleFromPaletteTokens(tokens: PaletteLike): CampaignContentStyle {
  const overlayMatch = tokens.overlayStart.match(RGB_RE);
  let overlayColor = DEFAULT_CAMPAIGN_CONTENT_STYLE.overlay.color;
  let overlayOpacity = DEFAULT_CAMPAIGN_CONTENT_STYLE.overlay.opacity;
  if (overlayMatch) {
    overlayColor = toHex(Number(overlayMatch[1]), Number(overlayMatch[2]), Number(overlayMatch[3]));
    overlayOpacity = parseOverlayOpacity(overlayMatch[4] != null ? Number(overlayMatch[4]) : 0.72) ?? 0.72;
  }

  return {
    heading: {
      fontFamily: "playfair",
      fontSize: "lg",
      fontWeight: "semibold",
      fontStyle: "normal",
      color: colorFromCss(tokens.headingColor, DEFAULT_CAMPAIGN_CONTENT_STYLE.heading.color)
    },
    subheading: {
      fontFamily: "inter",
      fontSize: "md",
      color: colorFromCss(tokens.bodyColor, DEFAULT_CAMPAIGN_CONTENT_STYLE.subheading.color)
    },
    offer: {
      fontFamily: "inter",
      fontSize: "sm",
      color: colorFromCss(tokens.accentColor, DEFAULT_CAMPAIGN_CONTENT_STYLE.offer.color)
    },
    cta: {
      backgroundColor: colorFromCss(tokens.buttonBg, DEFAULT_CAMPAIGN_CONTENT_STYLE.cta.backgroundColor),
      textColor: colorFromCss(tokens.buttonText, DEFAULT_CAMPAIGN_CONTENT_STYLE.cta.textColor)
    },
    layout: { horizontalAlign: "left" },
    overlay: {
      enabled: true,
      color: overlayColor,
      opacity: overlayOpacity
    }
  };
}

export const CAMPAIGN_FONT_LABELS: Record<CampaignFontFamily, string> = {
  playfair: "Playfair Display",
  inter: "Inter",
  georgia: "Georgia",
  system: "System UI"
};
