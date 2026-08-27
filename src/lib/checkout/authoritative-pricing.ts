import type { SupabaseClient } from "@supabase/supabase-js";
import type { CartItem, Product } from "@/types";
import { itemsSubtotal } from "@/lib/checkout/totals";
import { normalizeDbProduct, type DbRow } from "@/lib/products/get-by-slug";
import { resolveProductStatus } from "@/lib/products/status";
import { findProductVariant } from "@/lib/products/variants";
import type { ParsedOrderItem } from "@/lib/checkout/validation";

const MONEY_TOLERANCE = 0.01;

const PRODUCT_PRICE_SELECT = `
  id,
  name,
  slug,
  price,
  compare_price,
  images,
  status,
  is_active,
  stock_quantity,
  sku,
  product_variants(id, product_id, size, color, sku, stock_quantity, price, compare_price)
`;

export function moneyAmountsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= MONEY_TOLERANCE;
}

/**
 * No coupon/offer engine exists. Client-supplied discounts must not reduce the payable amount.
 * A positive client discount is rejected so checkout is not charged a different total than displayed.
 */
export function resolveAuthoritativeDiscount(
  clientDiscount: unknown
): { ok: true; discount: 0 } | { ok: false; error: string } {
  const raw = Number(clientDiscount ?? 0);
  if (!Number.isFinite(raw) || raw <= MONEY_TOLERANCE) {
    return { ok: true, discount: 0 };
  }
  return {
    ok: false,
    error: "This discount is no longer valid. Please review your order and try again."
  };
}

function firstImage(product: Product, fallback: string): string {
  const fromProduct = product.images?.[0];
  if (typeof fromProduct === "string" && fromProduct.trim()) return fromProduct;
  return fallback;
}

function resolveUnitPrice(product: Product, size: string, color: string): number | null {
  const variants = product.variants;
  if (variants && variants.length > 0) {
    const variant = findProductVariant(variants, size, color);
    if (!variant) return null;
    const unit = variant.price ?? product.price;
    return Number.isFinite(unit) && unit > 0 ? unit : null;
  }

  const unit = Number(product.price);
  return Number.isFinite(unit) && unit > 0 ? unit : null;
}

function isPurchasable(product: Product): { ok: true } | { ok: false; error: string } {
  if (product.is_active === false) {
    return { ok: false, error: `${product.name} is no longer available` };
  }

  const status = resolveProductStatus({
    status: product.status ?? null,
    is_active: product.is_active,
    total_stock: product.stock_quantity ?? null
  });

  if (status === "draft" || status === "archived") {
    return { ok: false, error: `${product.name} is no longer available` };
  }

  return { ok: true };
}

export type AuthoritativePricingResult =
  | { ok: true; items: CartItem[]; subtotal: number }
  | {
      ok: false;
      error: string;
      status: number;
      code?: "PRICE_CHANGED";
      items?: Array<{ productId: string; size: string; color: string; price: number }>;
    };

export async function resolveAuthoritativeOrderItems(
  db: SupabaseClient,
  lines: ParsedOrderItem[]
): Promise<AuthoritativePricingResult> {
  const productIds = [...new Set(lines.map((line) => line.productId))];

  const { data, error } = await db
    .from("products")
    .select(PRODUCT_PRICE_SELECT)
    .in("id", productIds);

  if (error) {
    return { ok: false, error: "Unable to verify product prices. Please try again.", status: 500 };
  }

  const productsById = new Map<string, Product>();
  for (const row of data ?? []) {
    const product = normalizeDbProduct(row as DbRow);
    productsById.set(product.id, product);
  }

  const pricedItems: CartItem[] = [];
  const mismatches: Array<{ productId: string; size: string; color: string; price: number }> = [];

  for (const line of lines) {
    const product = productsById.get(line.productId);
    if (!product) {
      return { ok: false, error: "One or more products are no longer available", status: 400 };
    }

    const purchasable = isPurchasable(product);
    if (!purchasable.ok) {
      return { ok: false, error: purchasable.error, status: 400 };
    }

    if (product.variants && product.variants.length > 0) {
      const variant = findProductVariant(product.variants, line.size, line.color);
      if (!variant) {
        return {
          ok: false,
          error: `Selected size or color is no longer available for ${product.name}`,
          status: 400
        };
      }
    }

    const unitPrice = resolveUnitPrice(product, line.size, line.color);
    if (unitPrice == null) {
      return {
        ok: false,
        error: `Price is unavailable for ${product.name}. Please review your cart and try again.`,
        status: 400
      };
    }

    if (line.clientPrice != null && !moneyAmountsMatch(line.clientPrice, unitPrice)) {
      mismatches.push({
        productId: product.id,
        size: line.size,
        color: line.color,
        price: unitPrice
      });
    }

    pricedItems.push({
      productId: product.id,
      name: product.name,
      price: unitPrice,
      size: line.size,
      color: line.color,
      quantity: line.quantity,
      image: firstImage(product, line.image),
      slug: product.slug
    });
  }

  if (mismatches.length > 0) {
    return {
      ok: false,
      error: "An item price has changed. Please review your cart and try again.",
      status: 409,
      code: "PRICE_CHANGED",
      items: mismatches
    };
  }

  const subtotal = itemsSubtotal(pricedItems);
  if (subtotal <= 0) {
    return { ok: false, error: "Order subtotal must be greater than zero", status: 400 };
  }

  return { ok: true, items: pricedItems, subtotal };
}
