import type { SearchIndex } from "@/lib/search/load-search-index";
import { SEARCH_SUGGESTION_LIMIT } from "@/lib/search/search-config";
import { normalizeSearchText, partialMatch, wordPrefixMatch } from "@/lib/search/tokenize-query";

type SuggestionCandidate = {
  label: string;
  priority: number;
};

function pushSuggestion(
  bucket: Map<string, SuggestionCandidate>,
  label: string,
  priority: number
) {
  const trimmed = label.trim();
  if (!trimmed) return;

  const existing = bucket.get(trimmed);
  if (!existing || priority > existing.priority) {
    bucket.set(trimmed, { label: trimmed, priority });
  }
}

function matchesSuggestionQuery(value: string, query: string): boolean {
  const normalizedValue = normalizeSearchText(value);
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return false;

  return (
    partialMatch(normalizedValue, normalizedQuery) ||
    wordPrefixMatch(normalizedValue, normalizedQuery)
  );
}

export function buildSearchSuggestions(index: SearchIndex, query: string, limit = SEARCH_SUGGESTION_LIMIT): string[] {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < 2) return [];

  const bucket = new Map<string, SuggestionCandidate>();

  for (const name of index.vocabulary.productNames) {
    if (matchesSuggestionQuery(name, normalizedQuery)) {
      pushSuggestion(bucket, name, 100);
    }
  }

  for (const category of index.vocabulary.categories) {
    if (matchesSuggestionQuery(category, normalizedQuery)) {
      pushSuggestion(bucket, category, 90);
    }
  }

  for (const color of index.vocabulary.colors) {
    if (matchesSuggestionQuery(color, normalizedQuery)) {
      pushSuggestion(bucket, color, 80);
    }
  }

  for (const fabric of index.vocabulary.fabrics) {
    if (matchesSuggestionQuery(fabric, normalizedQuery)) {
      pushSuggestion(bucket, fabric, 70);
    }
  }

  for (const occasion of index.vocabulary.occasions) {
    if (matchesSuggestionQuery(occasion, normalizedQuery)) {
      pushSuggestion(bucket, occasion, 60);
    }
  }

  for (const size of index.vocabulary.sizes) {
    if (matchesSuggestionQuery(size, normalizedQuery)) {
      pushSuggestion(bucket, size, 50);
    }
  }

  for (const tag of index.vocabulary.tags) {
    if (matchesSuggestionQuery(tag, normalizedQuery)) {
      pushSuggestion(bucket, tag, 40);
    }
  }

  for (const subCategory of index.vocabulary.subCategories) {
    if (matchesSuggestionQuery(subCategory, normalizedQuery)) {
      pushSuggestion(bucket, subCategory, 35);
    }
  }

  return [...bucket.values()]
    .sort((left, right) => {
      if (right.priority !== left.priority) return right.priority - left.priority;
      return left.label.localeCompare(right.label);
    })
    .slice(0, limit)
    .map((candidate) => candidate.label);
}
