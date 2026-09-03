"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AdminProductThumbnail } from "@/components/admin/AdminProductThumbnail";
import type { InventoryStatus } from "@/lib/admin/inventory";
import { getProductInventoryStatus, type AdminProductRow } from "@/lib/admin/products";

type CatalogProductPickerProps = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
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

function matchesProductSearch(product: AdminProductRow, query: string) {
  if (!query) return true;
  return (
    product.name.toLowerCase().includes(query) ||
    (product.category_name ?? "").toLowerCase().includes(query)
  );
}

export function CatalogProductPicker({ selectedIds, onChange, disabled }: CatalogProductPickerProps) {
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/admin/products");
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? "Failed to load products");
          if (!cancelled) setProducts([]);
          return;
        }
        if (!cancelled) setProducts(data.products ?? []);
      } catch {
        if (!cancelled) {
          toast.error("Failed to load products");
          setProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  const availableProducts = useMemo(
    () => products.filter((product) => getProductInventoryStatus(product) !== "out_of_stock"),
    [products]
  );

  const previouslySelectedOos = useMemo(
    () =>
      products.filter(
        (product) =>
          selectedSet.has(product.id) && getProductInventoryStatus(product) === "out_of_stock"
      ),
    [products, selectedSet]
  );

  const query = search.trim().toLowerCase();
  const filteredAvailable = useMemo(
    () => availableProducts.filter((product) => matchesProductSearch(product, query)),
    [availableProducts, query]
  );
  const filteredSelectedOos = useMemo(
    () => previouslySelectedOos.filter((product) => matchesProductSearch(product, query)),
    [previouslySelectedOos, query]
  );

  const toggle = (id: string) => {
    if (disabled) return;
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((item) => item !== id));
      return;
    }
    const product = productById.get(id);
    if (!product || getProductInventoryStatus(product) === "out_of_stock") return;
    onChange([...selectedIds, id]);
  };

  const hasVisibleRows = filteredAvailable.length > 0 || filteredSelectedOos.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground/70">
          <span className="font-semibold text-foreground">{selectedIds.length}</span> product
          {selectedIds.length === 1 ? "" : "s"} selected
        </p>
        {selectedIds.length > 0 ? (
          <button
            type="button"
            className="text-sm text-primary underline disabled:opacity-50"
            disabled={disabled}
            onClick={() => onChange([])}
          >
            Clear selection
          </button>
        ) : null}
      </div>

      <input
        type="search"
        placeholder="Search products…"
        className="w-full rounded-lg border px-3 py-2 text-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        disabled={disabled}
      />

      <div className="max-h-80 overflow-y-auto rounded-lg border bg-white">
        {loading ? (
          <p className="px-3 py-8 text-center text-sm text-foreground/60">Loading products…</p>
        ) : !hasVisibleRows ? (
          <p className="px-3 py-8 text-center text-sm text-foreground/60">
            {products.length === 0 ? "No products found." : "No products match your search."}
          </p>
        ) : (
          <>
            {filteredSelectedOos.length > 0 ? (
              <div className="border-b border-accent/10">
                <p className="bg-blush/30 px-3 py-2 text-xs font-semibold text-foreground/70">
                  Previously selected — Out of Stock
                </p>
                <ul>
                  {filteredSelectedOos.map((product) => (
                    <ProductPickerRow
                      key={product.id}
                      product={product}
                      checked
                      disabled={disabled}
                      onToggle={() => toggle(product.id)}
                    />
                  ))}
                </ul>
              </div>
            ) : null}
            {filteredAvailable.length > 0 ? (
              <ul>
                {filteredAvailable.map((product) => (
                  <ProductPickerRow
                    key={product.id}
                    product={product}
                    checked={selectedSet.has(product.id)}
                    disabled={disabled}
                    onToggle={() => toggle(product.id)}
                  />
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function ProductPickerRow({
  product,
  checked,
  disabled,
  onToggle
}: {
  product: AdminProductRow;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const inventoryStatus = getProductInventoryStatus(product);

  return (
    <li className="border-b border-accent/10 last:border-b-0">
      <label
        className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm ${
          checked ? "bg-blush/40" : "hover:bg-blush/20"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        <input
          type="checkbox"
          className="rounded border-accent/40"
          checked={checked}
          disabled={disabled}
          onChange={onToggle}
        />
        <AdminProductThumbnail src={product.images[0]} alt={product.name} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{product.name}</span>
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${INVENTORY_STATUS_STYLES[inventoryStatus]}`}
            >
              {INVENTORY_STATUS_LABELS[inventoryStatus]}
            </span>
          </span>
          <span className="mt-0.5 block text-xs text-foreground/50">
            {product.category_name ?? "Uncategorized"}
          </span>
        </span>
      </label>
    </li>
  );
}
