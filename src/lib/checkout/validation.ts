export type ParsedOrderItem = {
  productId: string;
  name: string;
  size: string;
  color: string;
  quantity: number;
  image: string;
  slug: string;
  /** Client-supplied unit price, if any. Never used as the payable amount. */
  clientPrice: number | null;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asQuantity(value: unknown): number | null {
  const quantity = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  return quantity;
}

function asOptionalClientPrice(value: unknown): number | null {
  if (value == null || value === "") return null;
  const price = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(price)) return null;
  return price;
}

/**
 * Validates cart line identity (product, variant, quantity).
 * Client `price` is parsed only for mismatch detection and is not authoritative.
 */
export function validateOrderItems(
  items: unknown
): { ok: true; items: ParsedOrderItem[] } | { ok: false; error: string } {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "Cart is empty" };
  }

  const parsed: ParsedOrderItem[] = [];

  for (const raw of items) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: "Invalid cart item" };
    }

    const row = raw as Record<string, unknown>;
    const productId = asNonEmptyString(row.productId);
    const size = asNonEmptyString(row.size);
    const color = asNonEmptyString(row.color);
    const quantity = asQuantity(row.quantity);

    if (!productId) {
      return { ok: false, error: "Each item must include a product" };
    }
    if (!size || !color) {
      return { ok: false, error: "Each item must include a size and color" };
    }
    if (quantity == null) {
      return { ok: false, error: "Each item must include a valid quantity" };
    }

    parsed.push({
      productId,
      name: asNonEmptyString(row.name) ?? "",
      size,
      color,
      quantity,
      image: typeof row.image === "string" ? row.image : "",
      slug: asNonEmptyString(row.slug) ?? "",
      clientPrice: asOptionalClientPrice(row.price)
    });
  }

  return { ok: true, items: parsed };
}
