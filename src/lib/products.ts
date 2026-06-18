import type { Product, Review } from "@/lib/types";

const u = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

export const PRODUCTS: Product[] = [
  {
    id: "p_daily_rose_01",
    slug: "rose-blush-everyday-blouse",
    name: "Rose Blush Everyday Blouse",
    category: "daily",
    occasion: ["Daily", "Office"],
    priceInr: 1299,
    rating: 4.6,
    reviewCount: 126,
    images: [
      { src: u("photo-1520975958225-7f61d3b2f0cc"), alt: "Rose blouse" },
      { src: u("photo-1520975958190-0c1d9d0b8e49"), alt: "Blouse detail" },
      { src: u("photo-1520975916090-3105956dac38"), alt: "Back tie detail" }
    ],
    colors: ["Blush Pink", "Cream", "Maroon"],
    fabrics: ["Cotton Silk", "Soft Lining"],
    sizes: [32, 34, 36, 38, 40, 42],
    stockBySize: { 32: 6, 34: 10, 36: 8, 38: 5, 40: 1, 42: 0 },
    shortDescription:
      "A premium everyday blouse with a clean neckline and graceful fit.",
    description:
      "Designed for comfort and elegance. This ready‑made blouse features a flattering neckline, soft lining, and a smooth silhouette that pairs beautifully with cotton and silk sarees.",
    tags: ["Soft Luxe", "Best Seller"]
  },
  {
    id: "p_designer_maroon_01",
    slug: "maroon-zari-designer-blouse",
    name: "Maroon Zari Designer Blouse",
    category: "designer",
    occasion: ["Wedding", "Festive", "Bridal"],
    priceInr: 3499,
    rating: 4.8,
    reviewCount: 88,
    images: [
      { src: u("photo-1520975778689-9a7c2b12a0d5"), alt: "Designer blouse" },
      { src: u("photo-1520975914029-2c7d1b6ae2bc"), alt: "Zari closeup" },
      { src: u("photo-1520975852591-4a8a0dcf5ce5"), alt: "Sleeve detail" }
    ],
    colors: ["Maroon", "Rose Gold"],
    fabrics: ["Raw Silk", "Zari Work"],
    sizes: [34, 36, 38, 40, 42],
    stockBySize: { 34: 2, 36: 4, 38: 3, 40: 2, 42: 1 },
    shortDescription:
      "Festive luxury with delicate zari work and premium raw silk.",
    description:
      "A couture-inspired ready‑made blouse crafted in raw silk with elegant zari detailing. Perfect for weddings, festive celebrations, and bridal looks.",
    tags: ["Luxury", "Wedding Collection", "Limited Stock"]
  },
  {
    id: "p_new_cream_01",
    slug: "cream-rose-gold-new-arrival",
    name: "Cream Rose‑Gold New Arrival",
    category: "new",
    occasion: ["Party", "Festive"],
    priceInr: 2199,
    rating: 4.5,
    reviewCount: 41,
    images: [
      { src: u("photo-1520975863783-1a0f1e6a04a3"), alt: "Cream blouse" },
      { src: u("photo-1520975868844-6db6f2d0f3ee"), alt: "Back design" },
      { src: u("photo-1520975876415-04c2b10bba53"), alt: "Fabric texture" }
    ],
    colors: ["Cream", "Light Gold", "Blush Pink"],
    fabrics: ["Art Silk", "Soft Net"],
    sizes: [32, 34, 36, 38, 40],
    stockBySize: { 32: 3, 34: 2, 36: 6, 38: 4, 40: 2 },
    shortDescription:
      "A new arrival with soft sheen, party-ready elegance and comfort.",
    description:
      "A modern feminine blouse with subtle shimmer and smooth finishing. Designed to complement pastel sarees and festive drapes.",
    tags: ["New Arrival"]
  }
];

export const REVIEWS: Review[] = [
  {
    id: "r1",
    productId: "p_daily_rose_01",
    name: "Ananya",
    rating: 5,
    comment: "Perfect fitting and looks very premium. Loved the fabric.",
    createdAt: "2026-05-12"
  },
  {
    id: "r2",
    productId: "p_designer_maroon_01",
    name: "Shruti",
    rating: 5,
    comment: "Stunning for weddings. The zari work is elegant, not loud.",
    createdAt: "2026-05-04"
  }
];

export function getProductBySlug(slug: string) {
  return PRODUCTS.find((p) => p.slug === slug) ?? null;
}

export function getProductsByCategory(category: Product["category"]) {
  return PRODUCTS.filter((p) => p.category === category);
}

export function isOutOfStock(p: Product) {
  return Object.values(p.stockBySize).every((n) => n <= 0);
}

export function getStockForSize(p: Product, size: number) {
  return p.stockBySize[size] ?? 0;
}

export function getLowestStock(p: Product) {
  const vals = Object.values(p.stockBySize).filter((n) => n > 0);
  return vals.length ? Math.min(...vals) : 0;
}

