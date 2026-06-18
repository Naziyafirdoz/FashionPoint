import type { CartItem } from "@/types";
import { itemsSubtotal } from "@/lib/checkout/totals";

export function validateOrderItems(items: unknown): { ok: true; items: CartItem[] } | { ok: false; error: string } {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "Cart is empty" };
  }

  const cartItems = items as CartItem[];
  const subtotal = itemsSubtotal(cartItems);

  if (subtotal <= 0) {
    return { ok: false, error: "Order subtotal must be greater than zero" };
  }

  return { ok: true, items: cartItems };
}
