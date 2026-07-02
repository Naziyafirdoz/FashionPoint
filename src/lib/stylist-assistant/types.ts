import type { Product } from "@/types";

export type StylistSessionFilters = {
  occasion?: string;
  color?: string;
  budgetMax?: number;
  fabric?: string;
  neck?: string;
  sleeve?: string;
  category?: string;
  size?: string;
  tag?: string;
  sort?: "new" | "bestseller" | "price_asc";
  inStockOnly?: boolean;
};

export type StylistIntent =
  | "product_search"
  | "new_arrivals"
  | "bestsellers"
  | "explain_fabric"
  | "list_categories"
  | "shipping_policy"
  | "return_policy"
  | "unsupported";

export type StylistProductResult = {
  product: Product;
  matchPercent: number;
  matchReasons: string[];
  inStock: boolean;
};

export type StylistChatResponse = {
  reply: string;
  sessionFilters: StylistSessionFilters;
  products: StylistProductResult[];
  intent: StylistIntent;
};

export type CatalogVocabulary = {
  colors: string[];
  fabrics: string[];
  occasions: string[];
  necks: string[];
  sleeves: string[];
  tags: string[];
  categories: string[];
  sizes: string[];
};
