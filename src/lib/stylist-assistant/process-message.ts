import type { Category } from "@/types";
import type { Product } from "@/types";
import { buildStylistReply } from "@/lib/stylist-assistant/build-response";
import {
  applyQuickChipFilters,
  detectIntent,
  extractFiltersFromMessage,
  mergeSessionFilters
} from "@/lib/stylist-assistant/extract-filters";
import { searchStylistProducts } from "@/lib/stylist-assistant/search-products";
import type { StylistChatResponse, StylistSessionFilters } from "@/lib/stylist-assistant/types";
import { buildCatalogVocabulary } from "@/lib/stylist-assistant/vocabulary";

export function processStylistMessage(params: {
  message: string;
  sessionFilters?: StylistSessionFilters;
  products: Product[];
  categories: Category[];
  fromQuickChip?: boolean;
  storeName?: string;
}): StylistChatResponse {
  const { message, products, categories, fromQuickChip = false, storeName } = params;
  const trimmed = message.trim();

  const vocabulary = buildCatalogVocabulary(products, categories);
  const intent = detectIntent(trimmed);

  const extracted = fromQuickChip
    ? { ...applyQuickChipFilters(trimmed), ...extractFiltersFromMessage(trimmed, vocabulary) }
    : extractFiltersFromMessage(trimmed, vocabulary);

  const sessionFilters = mergeSessionFilters(params.sessionFilters ?? {}, extracted, intent);

  const replyParams = {
    filters: sessionFilters,
    categories,
    products,
    storeName
  } as const;

  if (intent === "unsupported") {
    return {
      reply: buildStylistReply({
        intent,
        exact: [],
        alternatives: [],
        ...replyParams
      }),
      sessionFilters,
      products: [],
      intent
    };
  }

  if (intent === "shipping_policy" || intent === "return_policy" || intent === "list_categories") {
    return {
      reply: buildStylistReply({
        intent,
        exact: [],
        alternatives: [],
        ...replyParams
      }),
      sessionFilters,
      products: [],
      intent
    };
  }

  if (intent === "explain_fabric") {
    return {
      reply: buildStylistReply({
        intent,
        exact: [],
        alternatives: [],
        ...replyParams
      }),
      sessionFilters,
      products: [],
      intent
    };
  }

  const { exact, alternatives } = searchStylistProducts(products, sessionFilters);
  const displayResults = exact.length ? exact : alternatives;

  return {
    reply: buildStylistReply({
      intent,
      exact,
      alternatives,
      ...replyParams
    }),
    sessionFilters,
    products: displayResults,
    intent
  };
}
