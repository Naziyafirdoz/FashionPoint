export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/\s+/g, " ");
}

export function tokenizeSearchQuery(query: string): string[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];

  const rawTokens = normalized.split(/[\s,+/]+/).filter(Boolean);
  const tokens: string[] = [];

  for (let index = 0; index < rawTokens.length; index += 1) {
    const token = rawTokens[index];
    const next = rawTokens[index + 1];

    if (token === "free" && next === "size") {
      tokens.push("free size");
      index += 1;
      continue;
    }

    if (token === "party" && next === "wear") {
      tokens.push("party wear");
      index += 1;
      continue;
    }

    if (token === "daily" && next === "wear") {
      tokens.push("daily wear");
      index += 1;
      continue;
    }

    if (token === "designer" && next === "wear") {
      tokens.push("designer wear");
      index += 1;
      continue;
    }

    if (token.length >= 2 || /^\d/.test(token)) {
      tokens.push(token);
    }
  }

  return tokens;
}

export function partialMatch(haystack: string, needle: string): boolean {
  if (!needle) return false;
  return haystack.includes(needle);
}

export function wordPrefixMatch(haystack: string, needle: string): boolean {
  if (!needle) return false;
  const words = haystack.split(/[\s\-_/]+/);
  return words.some((word) => word.startsWith(needle));
}
