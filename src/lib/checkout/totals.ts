import type { ShippingQuote } from "@/lib/shipping/rates";
import type { CartItem } from "@/types";

export function itemsSubtotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function amountToPaise(rupees: number): number {
  return Math.round(Number(rupees) * 100);
}

export function computeCheckoutTotals(
  items: CartItem[],
  discount: number,
  quote?: ShippingQuote | null
) {
  const subtotal = itemsSubtotal(items);
  const shippingAmount = quote?.shippingAmount ?? 0;
  const total = Math.max(0, subtotal + shippingAmount - discount);

  return {
    subtotal,
    discount,
    shippingAmount,
    total,
    quote
  };
}
