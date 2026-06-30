/**
 * Shortens a product title at word boundaries when it does not fit two lines.
 * Returns the full title unchanged when it already fits.
 */
export function fitProductCardTitle(
  title: string,
  fitsWithinTwoLines: (candidate: string) => boolean
): string {
  const normalized = title.trim().replace(/\s+/g, " ");
  if (!normalized) return "";
  if (fitsWithinTwoLines(normalized)) return normalized;

  const words = normalized.split(" ");
  if (words.length <= 1) return normalized;

  for (let end = words.length - 1; end >= 1; end--) {
    const candidate = words.slice(0, end).join(" ");
    if (fitsWithinTwoLines(candidate)) {
      return candidate;
    }
  }

  return words[0] ?? normalized;
}
