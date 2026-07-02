import type { Category } from "@/types";
import type { Product } from "@/types";
import { processStylistMessage } from "@/lib/stylist-assistant/process-message";
import type { StylistChatResponse, StylistSessionFilters } from "@/lib/stylist-assistant/types";
import {
  getDeterministicStyleRecommendations,
  parseStylePreferences,
  type StyleRecommendation
} from "@/lib/style-recommendations";

export type { StyleRecommendation };

export async function getStyleRecommendations(
  preferences: Record<string, unknown>,
  products: Product[]
): Promise<StyleRecommendation[]> {
  const parsed = parseStylePreferences(preferences);
  if (!parsed || products.length === 0) return [];

  return getDeterministicStyleRecommendations(parsed, products);
}

export function stylistChat(params: {
  message: string;
  sessionFilters?: StylistSessionFilters;
  products: Product[];
  categories: Category[];
  fromQuickChip?: boolean;
}): StylistChatResponse {
  return processStylistMessage(params);
}
