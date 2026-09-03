import type { SupabaseClient } from "@supabase/supabase-js";
import type { OfferCandidate, OfferDiscountType, OfferScope } from "./types";

type OfferRow = {
  id: string;
  name: string;
  discount_type: string;
  discount_value: number | string;
  scope: string;
  is_enabled: boolean;
  starts_at: string;
  ends_at: string | null;
};

type OfferProductRow = {
  offer_id: string;
  product_id: string;
};

type OfferCategoryRow = {
  offer_id: string;
  category_id: string;
};

function isDiscountType(value: string): value is OfferDiscountType {
  return value === "percentage" || value === "fixed_amount";
}

function isScope(value: string): value is OfferScope {
  return value === "product" || value === "category";
}

function toCandidate(
  row: OfferRow,
  productIds: string[],
  categoryIds: string[]
): OfferCandidate | null {
  if (!isDiscountType(row.discount_type) || !isScope(row.scope)) return null;
  const discountValue = Number(row.discount_value);
  if (!Number.isFinite(discountValue)) return null;

  return {
    id: row.id,
    name: row.name,
    discountType: row.discount_type,
    discountValue,
    scope: row.scope,
    isEnabled: row.is_enabled === true,
    startsAt: new Date(row.starts_at),
    endsAt: row.ends_at ? new Date(row.ends_at) : null,
    productIds,
    categoryIds
  };
}

/**
 * Loads currently enabled, in-window offers for catalog and checkout evaluation.
 * Callers must pass database catalog identity, never client money.
 */
export async function loadOfferCandidates(
  db: SupabaseClient,
  input: {
    now?: Date;
    productIds: string[];
    categoryIds: string[];
  }
): Promise<OfferCandidate[]> {
  const nowIso = (input.now ?? new Date()).toISOString();
  const productIds = [...new Set(input.productIds.filter(Boolean))];
  const categoryIds = [...new Set(input.categoryIds.filter(Boolean))];

  const { data: offerRows, error: offerError } = await db
    .from("offers")
    .select("id, name, discount_type, discount_value, scope, is_enabled, starts_at, ends_at")
    .eq("is_enabled", true)
    .lte("starts_at", nowIso)
    .or(`ends_at.is.null,ends_at.gte."${nowIso}"`);

  if (offerError || !offerRows?.length) {
    return [];
  }

  const offers = offerRows as OfferRow[];
  const offerIds = offers.map((row) => row.id);

  const productIdsByOffer = new Map<string, string[]>();
  const categoryIdsByOffer = new Map<string, string[]>();

  if (productIds.length > 0) {
    const { data: productRows } = await db
      .from("offer_products")
      .select("offer_id, product_id")
      .in("offer_id", offerIds)
      .in("product_id", productIds);

    for (const row of (productRows ?? []) as OfferProductRow[]) {
      const list = productIdsByOffer.get(row.offer_id) ?? [];
      list.push(row.product_id);
      productIdsByOffer.set(row.offer_id, list);
    }
  }

  if (categoryIds.length > 0) {
    const { data: categoryRows } = await db
      .from("offer_categories")
      .select("offer_id, category_id")
      .in("offer_id", offerIds)
      .in("category_id", categoryIds);

    for (const row of (categoryRows ?? []) as OfferCategoryRow[]) {
      const list = categoryIdsByOffer.get(row.offer_id) ?? [];
      list.push(row.category_id);
      categoryIdsByOffer.set(row.offer_id, list);
    }
  }

  const candidates: OfferCandidate[] = [];
  for (const row of offers) {
    const candidate = toCandidate(
      row,
      productIdsByOffer.get(row.id) ?? [],
      categoryIdsByOffer.get(row.id) ?? []
    );
    if (!candidate) continue;
    if (candidate.scope === "product" && candidate.productIds.length === 0) continue;
    if (candidate.scope === "category" && candidate.categoryIds.length === 0) continue;
    candidates.push(candidate);
  }

  return candidates;
}
