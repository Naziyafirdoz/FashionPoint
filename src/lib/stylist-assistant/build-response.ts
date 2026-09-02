import type { Category } from "@/types";
import type { Product } from "@/types";
import { formatInr } from "@/lib/style-recommender-ui";
import { searchProductsByFabric } from "@/lib/stylist-assistant/search-products";
import type {
  StylistIntent,
  StylistProductResult,
  StylistSessionFilters
} from "@/lib/stylist-assistant/types";

export function buildOffTopicReply(storeName: string): string {
  return `I'm the ${storeName} Shopping Assistant and can help you find blouses, compare products, and answer questions about our collection.`;
}

const OFF_TOPIC_REPLY =
  "I'm the Fashion Point Shopping Assistant and can help you find blouses, compare products, and answer questions about our collection.";

const NO_MATCH_REPLY =
  "I couldn't find a matching product in our current collection.";

function describeFilters(filters: StylistSessionFilters): string {
  const parts: string[] = [];
  if (filters.color) parts.push(filters.color.toLowerCase());
  if (filters.occasion) parts.push(filters.occasion.toLowerCase());
  if (filters.fabric) parts.push(filters.fabric.toLowerCase());
  if (filters.neck) parts.push(`${filters.neck.toLowerCase()} neck`);
  if (filters.sleeve) parts.push(`${filters.sleeve.toLowerCase()} sleeve`);
  if (filters.budgetMax != null) parts.push(`under ${formatInr(filters.budgetMax)}`);
  return parts.join(" ");
}

export function buildStylistReply(params: {
  intent: StylistIntent;
  filters: StylistSessionFilters;
  exact: StylistProductResult[];
  alternatives: StylistProductResult[];
  categories: Category[];
  products: Product[];
}): string {
  const { intent, filters, exact, alternatives, categories, products } = params;

  if (intent === "unsupported") {
    return OFF_TOPIC_REPLY;
  }

  if (intent === "shipping_policy") {
    return "Shipping charges and delivery timelines depend on your location at checkout. Please see our Shipping Policy page for details.";
  }

  if (intent === "return_policy") {
    return "Return and refund eligibility is listed in our Return Policy. I can help you find products from our collection anytime.";
  }

  if (intent === "list_categories") {
    if (!categories.length) {
      return NO_MATCH_REPLY;
    }
    const names = categories.map((category) => category.name).join(", ");
    return `Our current blouse collections include: ${names}.`;
  }

  if (intent === "explain_fabric" && filters.fabric) {
    const fabricProducts = searchProductsByFabric(products, filters.fabric);
    if (!fabricProducts.length) {
      return `I couldn't find a matching product in our current collection for ${filters.fabric} fabric.`;
    }
    const minPrice = fabricProducts[0]?.price ?? 0;
    const maxPrice = fabricProducts[fabricProducts.length - 1]?.price ?? minPrice;
    return `We have ${fabricProducts.length} in-stock blouse${fabricProducts.length === 1 ? "" : "s"} in ${filters.fabric}, priced from ${formatInr(minPrice)} to ${formatInr(maxPrice)}.`;
  }

  const results = exact.length ? exact : alternatives;
  if (!results.length) {
    const described = describeFilters(filters);
    if (described) {
      return `We currently don't have a ${described} blouse in our catalog. ${NO_MATCH_REPLY}`;
    }
    return NO_MATCH_REPLY;
  }

  if (exact.length) {
    return `Here ${exact.length === 1 ? "is" : "are"} ${exact.length} matching blouse${exact.length === 1 ? "" : "s"} from our collection.`;
  }

  const described = describeFilters(filters);
  if (described) {
    return `We currently don't have a ${described} blouse. Here are the closest alternatives available in our collection.`;
  }

  return "Here are the closest matches from our collection.";
}
