export type ProductCategory = "daily" | "designer" | "new";

export type ProductOccasion =
  | "Daily"
  | "Office"
  | "Party"
  | "Wedding"
  | "Festive"
  | "Diwali"
  | "Bridal";

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  occasion: ProductOccasion[];
  priceInr: number;
  rating: number;
  reviewCount: number;
  images: { src: string; alt: string }[];
  colors: string[];
  fabrics: string[];
  sizes: number[];
  stockBySize: Record<number, number>;
  shortDescription: string;
  description: string;
  tags: string[];
};

export type Review = {
  id: string;
  productId: string;
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
  userPhotoUrl?: string;
};

