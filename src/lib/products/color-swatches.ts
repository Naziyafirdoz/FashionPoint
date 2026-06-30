import type { CSSProperties } from "react";
import type { ProductColorSwatch } from "@/types";

export type ProductColorFieldResult =
  | { ok: true; colors: string[]; color_swatches: ProductColorSwatch[] }
  | { ok: false; error: string };

export function normalizeHex(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;

  if (/^#[0-9A-Fa-f]{6}$/.test(withHash)) {
    return withHash.toUpperCase();
  }

  if (/^#[0-9A-Fa-f]{3}$/.test(withHash)) {
    const h = withHash.slice(1);
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toUpperCase();
  }

  return null;
}

export function isValidHex(value: string): boolean {
  return normalizeHex(value) !== null;
}

export function parseColorSwatchesFromDb(raw: unknown): ProductColorSwatch[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item): item is Record<string, unknown> => item != null && typeof item === "object")
    .map((item) => {
      const name =
        typeof item.name === "string"
          ? item.name.trim()
          : typeof item.color_name === "string"
            ? item.color_name.trim()
            : "";

      const hexRaw =
        typeof item.hex === "string"
          ? item.hex
          : typeof item.color_hex === "string"
            ? item.color_hex
            : "";

      const hex = hexRaw.trim() ? normalizeHex(hexRaw) : null;

      return { name, hex };
    })
    .filter((item) => item.name.length > 0);
}

export function resolveProductColorSwatches(
  colors: string[] | undefined | null,
  rawSwatches: unknown
): ProductColorSwatch[] {
  const parsed = parseColorSwatchesFromDb(rawSwatches);
  const colorNames = (colors ?? []).filter(Boolean);

  if (parsed.length === 0) {
    return colorNames.map((name) => ({ name, hex: null }));
  }

  const hexByName = new Map(parsed.map((swatch) => [swatch.name.toLowerCase(), swatch.hex]));
  const orderedNames = colorNames.length > 0 ? colorNames : parsed.map((swatch) => swatch.name);
  const seen = new Set<string>();
  const result: ProductColorSwatch[] = [];

  for (const name of orderedNames) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ name, hex: hexByName.get(key) ?? null });
  }

  for (const swatch of parsed) {
    const key = swatch.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(swatch);
    }
  }

  return result;
}

export function colorNamesFromSwatches(swatches: ProductColorSwatch[]): string[] {
  return swatches.map((swatch) => swatch.name).filter(Boolean);
}

export function sanitizeColorSwatchesForSave(swatches: ProductColorSwatch[]): {
  swatches: ProductColorSwatch[];
  colors: string[];
  error?: string;
} {
  const cleaned: ProductColorSwatch[] = [];
  const seen = new Set<string>();

  for (const entry of swatches) {
    const name = entry.name.trim();
    if (!name) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const hexInput = entry.hex?.trim() ?? "";
    const hex = hexInput ? normalizeHex(hexInput) : null;

    if (hexInput && !hex) {
      return {
        swatches: [],
        colors: [],
        error: `Invalid HEX color for "${name}". Use a value like #556B2F.`
      };
    }

    cleaned.push({ name, hex });
  }

  return {
    swatches: cleaned,
    colors: cleaned.map((swatch) => swatch.name)
  };
}

export function parseColorSwatchesFromBody(raw: unknown): ProductColorSwatch[] | null {
  if (!Array.isArray(raw)) return null;

  return raw
    .filter((item): item is Record<string, unknown> => item != null && typeof item === "object")
    .map((item) => ({
      name: typeof item.name === "string" ? item.name.trim() : "",
      hex:
        typeof item.hex === "string"
          ? item.hex.trim()
            ? normalizeHex(item.hex)
            : null
          : typeof item.color_hex === "string"
            ? item.color_hex.trim()
              ? normalizeHex(item.color_hex)
              : null
            : null
    }))
    .filter((item) => item.name.length > 0);
}

export function normalizeProductColorFields(
  body: Record<string, unknown>
): ProductColorFieldResult {
  const swatchesFromBody = parseColorSwatchesFromBody(body.color_swatches);

  if (swatchesFromBody) {
    const sanitized = sanitizeColorSwatchesForSave(swatchesFromBody);
    if (sanitized.error) {
      return { ok: false, error: sanitized.error };
    }
    return {
      ok: true,
      colors: sanitized.colors,
      color_swatches: sanitized.swatches
    };
  }

  const colors = Array.isArray(body.colors)
    ? body.colors.filter((color): color is string => typeof color === "string")
    : [];

  return {
    ok: true,
    colors,
    color_swatches: colors.map((name) => ({ name, hex: null }))
  };
}

export function isLightHex(hex: string): boolean {
  const normalized = normalizeHex(hex);
  if (!normalized) return true;

  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.82;
}

export function getSwatchBackgroundStyle(hex: string | null | undefined): CSSProperties {
  if (hex) {
    return { backgroundColor: hex };
  }

  return { backgroundColor: "#F3F3F3" };
}

export function getSwatchBorderClass(
  hex: string | null | undefined,
  selected: boolean
): string {
  if (selected) {
    return "border-2 border-primary shadow-[0_2px_8px_rgba(123,13,43,0.18)] ring-2 ring-primary/25 ring-offset-2";
  }

  if (!hex || isLightHex(hex)) {
    return "border-2 border-[#B8B8B8] hover:border-primary/40";
  }

  return "border-2 border-[#E8D4DA] hover:border-primary/40";
}

export function findSwatchHex(
  swatches: ProductColorSwatch[] | undefined,
  colorName: string
): string | null {
  const match = swatches?.find(
    (swatch) => swatch.name.toLowerCase() === colorName.toLowerCase()
  );
  return match?.hex ?? null;
}
