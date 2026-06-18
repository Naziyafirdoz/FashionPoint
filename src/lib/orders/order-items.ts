import type { CartItem } from "@/types";

export type NormalizedOrderItem = {
  productId: string;
  name: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  subtotal: number;
  image?: string;
  sku?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}

function readNumber(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const v = obj[key];
    if (v != null && v !== "") {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
}

function readProductImage(obj: Record<string, unknown>): string {
  const direct = readString(obj, "image");
  if (direct) return direct;

  const product = asRecord(obj.product);
  if (!product) return "";

  const images = product.images;
  if (!Array.isArray(images) || !images.length) return "";

  const first = images[0];
  if (typeof first === "string" && first.trim()) return first.trim();

  const imgObj = asRecord(first);
  if (!imgObj) return "";

  return readString(imgObj, "url", "src", "secure_url");
}

export function normalizeOrderItem(raw: unknown): NormalizedOrderItem | null {
  const obj = asRecord(raw);
  if (!obj) return null;

  const productId = readString(obj, "productId", "product_id");
  const name = readString(obj, "name");
  const size = readString(obj, "size");
  const color = readString(obj, "color");
  const image = readProductImage(obj);
  const sku = readString(obj, "sku");
  const quantity = Math.max(1, readNumber(obj, "quantity") || 1);
  const price = readNumber(obj, "price");

  if (!name && !productId) return null;

  return {
    productId,
    name: name || "Product",
    size: size || "—",
    color: color || "—",
    quantity,
    price,
    subtotal: price * quantity,
    image: image || undefined,
    sku: sku || undefined
  };
}

export function normalizeOrderItems(items: unknown): NormalizedOrderItem[] {
  if (!Array.isArray(items)) return [];
  return items.map(normalizeOrderItem).filter((item): item is NormalizedOrderItem => item != null);
}

function defaultFormatAmount(amount: number): string {
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

/** Unit price or `₹unit × qty = total` when quantity > 1. */
export function formatOrderItemPriceValue(
  item: Pick<NormalizedOrderItem, "price" | "quantity" | "subtotal">,
  formatAmount: (amount: number) => string = defaultFormatAmount
): string {
  const quantity = Math.max(1, item.quantity);
  const unitPrice = item.price;
  const lineTotal = item.subtotal || unitPrice * quantity;

  if (quantity === 1) {
    return formatAmount(unitPrice);
  }

  return `${formatAmount(unitPrice)} × ${quantity} = ${formatAmount(lineTotal)}`;
}

/** Full price line for order item lists: `Price: ₹499` or `₹499 × 2 = ₹998`. */
export function formatOrderItemPriceLine(
  item: Pick<NormalizedOrderItem, "price" | "quantity" | "subtotal">,
  formatAmount: (amount: number) => string = defaultFormatAmount
): string {
  const quantity = Math.max(1, item.quantity);
  const value = formatOrderItemPriceValue(item, formatAmount);
  if (quantity === 1) {
    return `Price: ${value}`;
  }
  return value;
}

export function isCartItemArray(items: unknown): items is CartItem[] {
  return Array.isArray(items) && items.every((i) => asRecord(i) != null);
}
