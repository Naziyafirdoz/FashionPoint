import type { SupabaseClient } from "@supabase/supabase-js";

export type CatalogTargetScope = "product" | "category";

export type CatalogTargeting = {
  productIds: string[];
  categoryIds: string[];
};

export type CatalogTargetingInput = {
  scope: CatalogTargetScope;
  productIds: string[];
  categoryIds: string[];
};

export type CatalogTargetEntity = "offer" | "campaign";

const SCOPES = new Set<CatalogTargetScope>(["product", "category"]);

export function isCatalogTargetScope(value: string): value is CatalogTargetScope {
  return SCOPES.has(value as CatalogTargetScope);
}

export function uniqueIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

export function findMissingIds(requested: string[], existing: string[]): string[] {
  const present = new Set(existing);
  return requested.filter((id) => !present.has(id));
}

export function parseIdList(
  value: unknown,
  field: string
): { ok: true; ids: string[] } | { ok: false; error: string } {
  if (value == null) return { ok: true, ids: [] };
  if (!Array.isArray(value)) {
    return { ok: false, error: `${field} must be an array of IDs` };
  }

  const ids: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      return { ok: false, error: `${field} must contain only string IDs` };
    }
    const trimmed = item.trim();
    if (!trimmed) {
      return { ok: false, error: `${field} cannot include blank IDs` };
    }
    ids.push(trimmed);
  }

  return { ok: true, ids: uniqueIds(ids) };
}

export function parseCatalogTargeting(
  row: Record<string, unknown>,
  entity: CatalogTargetEntity
): { ok: true; targeting: CatalogTargetingInput } | { ok: false; error: string } {
  const scopeRaw = typeof row.scope === "string" ? row.scope : "";
  if (!isCatalogTargetScope(scopeRaw)) {
    return { ok: false, error: "Scope must be product or category" };
  }

  const productList = parseIdList(row.productIds ?? row.product_ids, "productIds");
  if (!productList.ok) return productList;
  const categoryList = parseIdList(row.categoryIds ?? row.category_ids, "categoryIds");
  if (!categoryList.ok) return categoryList;

  if (scopeRaw === "product") {
    if (productList.ids.length === 0) {
      return { ok: false, error: `Select at least one product for a product ${entity}` };
    }
    if (categoryList.ids.length > 0) {
      return { ok: false, error: `Category targeting cannot be used on a product ${entity}` };
    }
  } else {
    if (categoryList.ids.length === 0) {
      return { ok: false, error: `Select at least one category for a category ${entity}` };
    }
    if (productList.ids.length > 0) {
      return { ok: false, error: `Product targeting cannot be used on a category ${entity}` };
    }
  }

  return {
    ok: true,
    targeting: {
      scope: scopeRaw,
      productIds: productList.ids,
      categoryIds: categoryList.ids
    }
  };
}

export async function assertCatalogTargetIdsExist(
  db: SupabaseClient,
  input: CatalogTargetingInput,
  logError: (event: string, details: Record<string, unknown>) => void,
  writeError: string
): Promise<{ ok: true } | { ok: false; error: string; status: 400 | 500 }> {
  if (input.scope === "product") {
    const { data, error } = await db.from("products").select("id").in("id", input.productIds);
    if (error) {
      logError("verify_products_failed", { code: error.code, message: error.message });
      return { ok: false, error: writeError, status: 500 };
    }
    const missing = findMissingIds(
      input.productIds,
      (data ?? []).map((row) => row.id as string)
    );
    if (missing.length > 0) {
      return { ok: false, error: "One or more selected products were not found", status: 400 };
    }
    return { ok: true };
  }

  const { data, error } = await db.from("categories").select("id").in("id", input.categoryIds);
  if (error) {
    logError("verify_categories_failed", { code: error.code, message: error.message });
    return { ok: false, error: writeError, status: 500 };
  }
  const missing = findMissingIds(
    input.categoryIds,
    (data ?? []).map((row) => row.id as string)
  );
  if (missing.length > 0) {
    return { ok: false, error: "One or more selected categories were not found", status: 400 };
  }
  return { ok: true };
}
