const HERO_DESCRIPTION_MAX_LENGTH = 200;

/**
 * Shortens a category description for the hero banner only.
 * Preserves whole words, never appends ellipsis, and leaves short text unchanged.
 */
export function formatHeroDescription(
  description: string,
  maxLength = HERO_DESCRIPTION_MAX_LENGTH
): string {
  const normalized = description.trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length <= maxLength) {
    return normalized;
  }

  const withinLimit = normalized.slice(0, maxLength);
  const lastSpace = withinLimit.lastIndexOf(" ");

  if (lastSpace <= 0) {
    return normalized;
  }

  return withinLimit
    .slice(0, lastSpace)
    .trim()
    .replace(/[,;:\-–—]+$/, "")
    .trim();
}
