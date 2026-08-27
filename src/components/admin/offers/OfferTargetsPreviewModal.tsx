"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { AdminCategoryThumbnail } from "@/components/admin/AdminCategoryThumbnail";
import { AdminProductThumbnail } from "@/components/admin/AdminProductThumbnail";
import type { AdminCategoryRow } from "@/lib/admin/categories";
import { getInventoryStatus, type InventoryStatus } from "@/lib/admin/inventory";
import type { AdminOfferDto } from "@/lib/admin/offers";
import {
  getProductInventoryStatus,
  getProductPublicationStatus,
  type AdminProductDetail,
  type AdminProductRow
} from "@/lib/admin/products";

type OfferTargetsPreviewModalProps = {
  open: boolean;
  offer: AdminOfferDto | null;
  onClose: () => void;
};

type ProductPreviewRow = {
  id: string;
  missing: boolean;
  name: string;
  image?: string;
  categoryName?: string | null;
  inventory?: InventoryStatus;
  archived: boolean;
  draft: boolean;
};

type CategoryPreviewRow = {
  id: string;
  missing: boolean;
  name: string;
  image?: string | null;
  inactive: boolean;
};

const INVENTORY_STATUS_STYLES: Record<InventoryStatus, string> = {
  in_stock: "bg-green-100 text-green-800",
  low_stock: "bg-amber-100 text-amber-800",
  out_of_stock: "bg-red-100 text-red-800"
};

const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock"
};

function badgeClass(extra: string) {
  return `inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${extra}`;
}

function productRowFromList(product: AdminProductRow): ProductPreviewRow {
  const publication = getProductPublicationStatus(product);
  return {
    id: product.id,
    missing: false,
    name: product.name,
    image: product.images[0],
    categoryName: product.category_name,
    inventory: getProductInventoryStatus(product),
    archived: publication === "archived",
    draft: publication === "draft"
  };
}

function productRowFromDetail(product: AdminProductDetail): ProductPreviewRow {
  const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock_quantity, 0);
  return {
    id: product.id,
    missing: false,
    name: product.name,
    image: product.images[0],
    categoryName: null,
    inventory: getInventoryStatus(totalStock),
    archived: product.status === "archived",
    draft: product.status === "draft"
  };
}

function missingProductRow(id: string): ProductPreviewRow {
  return {
    id,
    missing: true,
    name: "Product no longer available",
    archived: false,
    draft: false
  };
}

function missingCategoryRow(id: string): CategoryPreviewRow {
  return {
    id,
    missing: true,
    name: "Category no longer available",
    inactive: false
  };
}

export function OfferTargetsPreviewModal({ open, offer, onClose }: OfferTargetsPreviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productRows, setProductRows] = useState<ProductPreviewRow[]>([]);
  const [categoryRows, setCategoryRows] = useState<CategoryPreviewRow[]>([]);
  const [reloadToken, setReloadToken] = useState(0);

  const productsCache = useRef<AdminProductRow[] | null>(null);
  const categoriesCache = useRef<AdminCategoryRow[] | null>(null);
  const productDetailCache = useRef<Map<string, AdminProductDetail | "missing">>(new Map());

  const loadProductsList = useCallback(async (force: boolean) => {
    if (!force && productsCache.current) return productsCache.current;
    const res = await fetch("/api/admin/products");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof data.error === "string" ? data.error : "Failed to load products");
    }
    const products = (data.products ?? []) as AdminProductRow[];
    productsCache.current = products;
    return products;
  }, []);

  const loadCategoriesList = useCallback(async (force: boolean) => {
    if (!force && categoriesCache.current) return categoriesCache.current;
    const res = await fetch("/api/admin/categories");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof data.error === "string" ? data.error : "Failed to load categories");
    }
    const categories = (data.categories ?? []) as AdminCategoryRow[];
    categoriesCache.current = categories;
    return categories;
  }, []);

  const loadMissingProductDetails = useCallback(async (ids: string[]) => {
    const unresolved = ids.filter((id) => !productDetailCache.current.has(id));
    if (unresolved.length === 0) return;

    const results = await Promise.all(
      unresolved.map(async (id) => {
        try {
          const res = await fetch(`/api/admin/products/${id}`);
          if (res.status === 404) return { id, product: "missing" as const };
          const data = await res.json().catch(() => ({}));
          if (!res.ok) return { id, product: "missing" as const };
          return { id, product: data.product as AdminProductDetail };
        } catch {
          return { id, product: "missing" as const };
        }
      })
    );

    for (const result of results) {
      productDetailCache.current.set(result.id, result.product === "missing" ? "missing" : result.product);
    }
  }, []);

  useEffect(() => {
    if (!open || !offer) return;

    const selected = offer;
    let cancelled = false;
    const force = reloadToken > 0;

    async function resolveTargets() {
      setLoading(true);
      setError(null);
      try {
        if (selected.scope === "product") {
          const products = await loadProductsList(force);
          const byId = new Map(products.map((product) => [product.id, product]));
          const missingIds = selected.productIds.filter((id) => !byId.has(id));
          if (missingIds.length > 0) {
            await loadMissingProductDetails(missingIds);
          }
          if (cancelled) return;
          setProductRows(
            selected.productIds.map((id) => {
              const listed = byId.get(id);
              if (listed) return productRowFromList(listed);
              const detail = productDetailCache.current.get(id);
              if (detail && detail !== "missing") return productRowFromDetail(detail);
              return missingProductRow(id);
            })
          );
          setCategoryRows([]);
          return;
        }

        const categories = await loadCategoriesList(force);
        if (cancelled) return;
        const byId = new Map(categories.map((category) => [category.id, category]));
        setCategoryRows(
          selected.categoryIds.map((id) => {
            const category = byId.get(id);
            if (!category) return missingCategoryRow(id);
            return {
              id: category.id,
              missing: false,
              name: category.name,
              image: category.homepage_banner_image_url ?? category.image_url,
              inactive: !category.is_active
            };
          })
        );
        setProductRows([]);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load targets");
        setProductRows([]);
        setCategoryRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void resolveTargets();
    return () => {
      cancelled = true;
    };
  }, [open, offer, reloadToken, loadProductsList, loadCategoriesList, loadMissingProductDetails]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setReloadToken(0);
  }, [open]);

  if (!open || !offer) return null;

  const isProductScope = offer.scope === "product";
  const title = isProductScope ? "Targeted Products" : "Targeted Categories";
  const titleId = "offer-targets-preview-title";
  const empty =
    !loading &&
    !error &&
    (isProductScope ? offer.productIds.length === 0 : offer.categoryIds.length === 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-lg font-bold text-primary">
              {title}
            </h2>
            <p className="mt-1 truncate text-sm text-foreground/60">{offer.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 hover:bg-blush"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <p className="py-8 text-center text-sm text-foreground/60">Loading targets…</p>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                className="mt-3 text-sm text-primary underline"
                onClick={() => {
                  productsCache.current = null;
                  categoriesCache.current = null;
                  productDetailCache.current.clear();
                  setReloadToken((token) => token + 1);
                }}
              >
                Retry
              </button>
            </div>
          ) : empty ? (
            <p className="py-8 text-center text-sm text-foreground/60">
              This offer has no {isProductScope ? "product" : "category"} targets.
            </p>
          ) : isProductScope ? (
            <ul className="divide-y divide-accent/10">
              {productRows.map((row) => (
                <li key={row.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <AdminProductThumbnail src={row.missing ? undefined : row.image} alt={row.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{row.name}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-foreground/50">
                      {!row.missing && row.categoryName ? <span>{row.categoryName}</span> : null}
                      {row.inventory ? (
                        <span className={badgeClass(INVENTORY_STATUS_STYLES[row.inventory])}>
                          {INVENTORY_STATUS_LABELS[row.inventory]}
                        </span>
                      ) : null}
                      {row.archived ? (
                        <span className={badgeClass("bg-gray-100 text-gray-700")}>Archived</span>
                      ) : null}
                      {row.draft ? (
                        <span className={badgeClass("bg-gray-100 text-gray-700")}>Draft</span>
                      ) : null}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="divide-y divide-accent/10">
              {categoryRows.map((row) => (
                <li key={row.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <AdminCategoryThumbnail src={row.missing ? null : row.image} alt={row.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{row.name}</span>
                    {row.inactive ? (
                      <span className={`mt-0.5 ${badgeClass("bg-gray-100 text-gray-700")}`}>Inactive</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 flex justify-end border-t border-accent/10 pt-4">
          <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
