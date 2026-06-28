import type { Category, Product, BlogPost } from "@/types";

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

export const CATEGORIES: Category[] = [
  {
    id: "cat-daily",
    name: "Daily Wear Blouses",
    slug: "daily-wear",
    description: "Comfortable styles for everyday elegance.",
    image_url: img("photo-1595777455318-2b71b2a3b6b5"),
    sort_order: 1,
    is_active: true,
    show_in_navbar: false,
    navbar_position: null
  },
  {
    id: "cat-designer",
    name: "Designer Wear Blouses",
    slug: "designer-wear",
    description: "Exquisite designs for every celebration.",
    image_url: img("photo-1610030469983-98e550b8b4b4"),
    sort_order: 2,
    is_active: true,
    show_in_navbar: false,
    navbar_position: null
  },
  {
    id: "cat-party",
    name: "Party Wear Blouses",
    slug: "party-wear",
    description: "Stand out in styles that sparkle.",
    image_url: img("photo-1583394838336-acd9777362f0"),
    sort_order: 3,
    is_active: true,
    show_in_navbar: false,
    navbar_position: null
  },
  {
    id: "cat-soon",
    name: "Soon",
    slug: "soon",
    description: "Something exclusive is coming soon!",
    image_url: img("photo-1572804013309-59a6b509c0f0"),
    sort_order: 4,
    is_active: true,
    show_in_navbar: false,
    navbar_position: null
  }
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Pink Silk Embroidered Designer Blouse",
    slug: "pink-silk-embroidered-designer-blouse",
    short_description:
      "Elegant pink silk blouse featuring premium embroidery work perfect for weddings and festive occasions.",
    detailed_description:
      "Crafted with luxurious silk fabric and intricate embroidery, this designer blouse offers a flattering fit and timeless elegance.",
    category_id: "cat-designer",
    price: 3499,
    compare_price: 4499,
    sku: "FP-DSG-001",
    fabric: "Silk",
    neck_type: "Boat Neck",
    sleeve_type: "Half Sleeve",
    closure_type: "Hook",
    occasion: ["Wedding", "Festive"],
    colors: ["Pink", "Maroon"],
    sizes: ["XS(32)", "S(34)", "M(36)", "L(38)", "XL(40)", "XXL(42)"],
    images: [img("photo-1610030469983-98e550b8b4b4"), img("photo-1595777455318-2b71b2a3b6b5")],
    tags: ["embroidered", "silk", "designer"],
    is_active: true,
    is_featured: true,
    is_bestseller: true,
    is_new: true,
    ai_size_enabled: true,
    ai_color_enabled: true,
    ai_style_enabled: true,
    seo_title: "Pink Silk Designer Blouse | Fashion Point",
    seo_description: "Shop pink silk embroidered designer blouse for weddings and festive wear.",
    rating: 4.8,
    review_count: 124,
    variants: [
      { id: "v1", product_id: "1", size: "M(36)", color: "Pink", stock_quantity: 8 },
      { id: "v2", product_id: "1", size: "L(38)", color: "Pink", stock_quantity: 4 }
    ]
  },
  {
    id: "2",
    name: "Maroon Zari Party Wear Blouse",
    slug: "maroon-zari-party-wear-blouse",
    short_description: "Festive maroon blouse with delicate zari work.",
    detailed_description: "Premium party wear blouse with zari detailing and comfortable lining.",
    category_id: "cat-party",
    price: 2999,
    compare_price: 3799,
    sku: "FP-PTY-002",
    fabric: "Georgette",
    neck_type: "V-Neck",
    sleeve_type: "Sleeveless",
    closure_type: "Zip",
    occasion: ["Party", "Festive"],
    colors: ["Maroon", "Gold"],
    sizes: ["S(34)", "M(36)", "L(38)", "XL(40)"],
    images: [img("photo-1583394838336-acd9777362f0")],
    tags: ["zari", "party"],
    is_active: true,
    is_featured: false,
    is_bestseller: true,
    is_new: false,
    ai_size_enabled: true,
    ai_color_enabled: true,
    ai_style_enabled: true,
    rating: 4.6,
    review_count: 89,
    variants: [
      { id: "v3", product_id: "2", size: "M(36)", color: "Maroon", stock_quantity: 0 }
    ]
  },
  {
    id: "3",
    name: "Cotton Comfort Daily Wear Blouse",
    slug: "cotton-comfort-daily-wear-blouse",
    short_description: "Soft cotton blouse for all-day comfort.",
    detailed_description: "Breathable cotton fabric with a classic round neck — perfect for daily wear.",
    category_id: "cat-daily",
    price: 1299,
    compare_price: 1599,
    sku: "FP-DLY-003",
    fabric: "Cotton",
    neck_type: "Round",
    sleeve_type: "Short",
    closure_type: "Hook",
    occasion: ["Daily", "Office"],
    colors: ["White", "Pink", "Blue"],
    sizes: ["XS(32)", "S(34)", "M(36)", "L(38)", "XL(40)", "XXL(42)"],
    images: [img("photo-1595777455318-2b71b2a3b6b5")],
    tags: ["cotton", "daily"],
    is_active: true,
    is_featured: false,
    is_bestseller: false,
    is_new: true,
    ai_size_enabled: true,
    ai_color_enabled: true,
    ai_style_enabled: false,
    rating: 4.5,
    review_count: 56,
    variants: [
      { id: "v4", product_id: "3", size: "M(36)", color: "Pink", stock_quantity: 12 }
    ]
  }
];

export const SAMPLE_BLOGS: BlogPost[] = [
  {
    id: "b1",
    title: "Top 10 Designer Blouses for 2026",
    slug: "top-10-designer-blouses-2026",
    excerpt: "Discover the most trending designer blouses this season.",
    is_published: true,
    published_at: "2026-01-15",
    category: "Trends",
    tags: ["designer", "trends"]
  },
  {
    id: "b2",
    title: "How To Choose Blouse Size",
    slug: "how-to-choose-blouse-size",
    excerpt: "A complete guide to measuring yourself for the perfect fit.",
    is_published: true,
    published_at: "2026-02-01",
    category: "Guides",
    tags: ["size", "guide"]
  },
  {
    id: "b3",
    title: "Trending Wedding Blouses 2026",
    slug: "trending-wedding-blouses-2026",
    excerpt: "Wedding season picks our stylists love.",
    is_published: true,
    published_at: "2026-03-10",
    category: "Wedding",
    tags: ["wedding", "trends"]
  }
];

export function getProductBySlug(slug: string) {
  return MOCK_PRODUCTS.find((p) => p.slug === slug);
}

export function getProductsByCategory(slug: string) {
  const cat = CATEGORIES.find((c) => c.slug === slug);
  if (!cat) return [];
  return MOCK_PRODUCTS.filter((p) => p.category_id === cat.id);
}
