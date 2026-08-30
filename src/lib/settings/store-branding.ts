export const STORE_FONT_FAMILIES = ["playfair", "inter", "georgia", "system"] as const;
export const STORE_BRAND_ALIGNS = ["left", "center"] as const;

export type StoreFontFamily = (typeof STORE_FONT_FAMILIES)[number];
export type StoreBrandAlign = (typeof STORE_BRAND_ALIGNS)[number];

export type StoreBranding = {
  fontFamily: StoreFontFamily;
  primaryColor: string;
  secondaryColor: string;
  headingColor: string;
  bodyTextColor: string;
  brandAlign: StoreBrandAlign;
};

export const DEFAULT_STORE_BRANDING: StoreBranding = {
  fontFamily: "playfair",
  primaryColor: "#7B0D2B",
  secondaryColor: "#B8860B",
  headingColor: "#7B0D2B",
  bodyTextColor: "#1A1A1A",
  brandAlign: "left"
};

export const STORE_FONT_LABELS: Record<StoreFontFamily, string> = {
  playfair: "Playfair Display",
  inter: "Inter",
  georgia: "Georgia",
  system: "System UI"
};

const DISPLAY_FONT_STACK: Record<StoreFontFamily, string> = {
  playfair: "",
  inter: "var(--font-sans), system-ui, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
  system: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
};

const PREVIEW_FONT_STACK: Record<StoreFontFamily, string> = {
  playfair: "var(--font-display), Georgia, serif",
  inter: "var(--font-sans), system-ui, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
  system: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
};

export function isStoreFontFamily(value: string): value is StoreFontFamily {
  return (STORE_FONT_FAMILIES as readonly string[]).includes(value);
}

export function isStoreBrandAlign(value: string): value is StoreBrandAlign {
  return (STORE_BRAND_ALIGNS as readonly string[]).includes(value);
}

export function normalizeHexColor(value: string): string | null {
  const raw = value.trim();
  const long = raw.match(/^#([0-9a-fA-F]{6})$/);
  if (long) return `#${long[1].toUpperCase()}`;
  const short = raw.match(/^#([0-9a-fA-F]{3})$/);
  if (!short) return null;
  return `#${short[1]
    .split("")
    .map((char) => `${char}${char}`)
    .join("")
    .toUpperCase()}`;
}

export function isValidHexColor(value: string): boolean {
  return normalizeHexColor(value) !== null;
}

export function parseStoredFontFamily(value: unknown): StoreFontFamily {
  if (typeof value !== "string") return DEFAULT_STORE_BRANDING.fontFamily;
  const trimmed = value.trim().toLowerCase();
  return isStoreFontFamily(trimmed) ? trimmed : DEFAULT_STORE_BRANDING.fontFamily;
}

export function parseStoredBrandAlign(value: unknown): StoreBrandAlign {
  if (typeof value !== "string") return DEFAULT_STORE_BRANDING.brandAlign;
  const trimmed = value.trim().toLowerCase();
  return isStoreBrandAlign(trimmed) ? trimmed : DEFAULT_STORE_BRANDING.brandAlign;
}

export function parseStoredHexColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  return normalizeHexColor(value) ?? fallback;
}

export function parseStoredBranding(value: unknown): StoreBranding {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_STORE_BRANDING };
  }

  const row = value as Record<string, unknown>;
  return {
    fontFamily: parseStoredFontFamily(row.fontFamily),
    primaryColor: parseStoredHexColor(row.primaryColor, DEFAULT_STORE_BRANDING.primaryColor),
    secondaryColor: parseStoredHexColor(row.secondaryColor, DEFAULT_STORE_BRANDING.secondaryColor),
    headingColor: parseStoredHexColor(row.headingColor, DEFAULT_STORE_BRANDING.headingColor),
    bodyTextColor: parseStoredHexColor(row.bodyTextColor, DEFAULT_STORE_BRANDING.bodyTextColor),
    brandAlign: parseStoredBrandAlign(row.brandAlign)
  };
}

export function parseBrandingInput(
  value: unknown
): { ok: true; branding: StoreBranding } | { ok: false; error: string } {
  if (value == null) {
    return { ok: true, branding: { ...DEFAULT_STORE_BRANDING } };
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Branding must be an object" };
  }

  const row = value as Record<string, unknown>;

  const fontFamily = parseStoredFontFamily(row.fontFamily);

  const primaryColor = parseRequiredHex(row.primaryColor, "Primary color");
  if (!primaryColor.ok) return primaryColor;
  const secondaryColor = parseRequiredHex(row.secondaryColor, "Secondary color");
  if (!secondaryColor.ok) return secondaryColor;
  const headingColor = parseRequiredHex(row.headingColor, "Heading color");
  if (!headingColor.ok) return headingColor;
  const bodyTextColor = parseRequiredHex(row.bodyTextColor, "Body text color");
  if (!bodyTextColor.ok) return bodyTextColor;

  return {
    ok: true,
    branding: {
      fontFamily,
      primaryColor: primaryColor.value,
      secondaryColor: secondaryColor.value,
      headingColor: headingColor.value,
      bodyTextColor: bodyTextColor.value,
      brandAlign: parseStoredBrandAlign(row.brandAlign)
    }
  };
}

function parseRequiredHex(
  value: unknown,
  label: string
): { ok: true; value: string } | { ok: false; error: string } {
  if (value == null || value === "") {
    return { ok: true, value: fallbackHex(label) };
  }
  if (typeof value !== "string") {
    return { ok: false, error: `${label} must be a string` };
  }
  const normalized = normalizeHexColor(value);
  if (!normalized) {
    return { ok: false, error: `${label} must be a valid hex color such as #7B0D2B` };
  }
  return { ok: true, value: normalized };
}

function fallbackHex(label: string): string {
  switch (label) {
    case "Secondary color":
      return DEFAULT_STORE_BRANDING.secondaryColor;
    case "Body text color":
      return DEFAULT_STORE_BRANDING.bodyTextColor;
    default:
      return DEFAULT_STORE_BRANDING.primaryColor;
  }
}

export function resolveDisplayFontStack(fontFamily: StoreFontFamily): string | undefined {
  const stack = DISPLAY_FONT_STACK[fontFamily];
  return stack || undefined;
}

export function resolvePreviewFontStack(fontFamily: StoreFontFamily): string {
  return PREVIEW_FONT_STACK[fontFamily];
}
