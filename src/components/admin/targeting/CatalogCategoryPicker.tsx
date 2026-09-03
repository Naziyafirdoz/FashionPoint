"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AdminCategoryThumbnail } from "@/components/admin/AdminCategoryThumbnail";
import type { AdminCategoryRow } from "@/lib/admin/categories";
import type { InventoryStatus } from "@/lib/admin/inventory";
import { getProductInventoryStatus, type AdminProductRow } from "@/lib/admin/products";

type CatalogCategoryPickerProps = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

type CategoryPickerItem = AdminCategoryRow & { missing?: boolean };

type CategoryInventory = {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  available: number;
};

const EMPTY_INVENTORY: CategoryInventory = {
  total: 0,
  inStock: 0,
  lowStock: 0,
  outOfStock: 0,
  available: 0
};

const INVENTORY_STATUS_STYLES: Record<InventoryStatus, string> = {
  in_stock: "bg-green-100 text-green-800",
  low_stock: "bg-amber-100 text-amber-800",
  out_of_stock: "bg-red-100 text-red-800"
};

function matchesCategorySearch(category: CategoryPickerItem, query: string) {
  if (!query) return true;
  return (
    category.name.toLowerCase().includes(query) || category.slug.toLowerCase().includes(query)
  );
}

function missingCategoryRow(id: string): CategoryPickerItem {
  return {
    id,
    name: "Previously selected category",
    slug: "",
    description: null,
    image_url: null,
    sort_order: 0,
    is_active: false,
    show_in_navbar: false,
    navbar_position: null,
    show_on_homepage: false,
    homepage_description: null,
    homepage_display_order: 0,
    homepage_theme: null,
    homepage_button_text: null,
    homepage_banner_image_url: null,
    created_at: "",
    product_count: 0,
    missing: true
  };
}

function deriveCategoryInventory(products: AdminProductRow[]): Map<string, CategoryInventory> {
  const map = new Map<string, CategoryInventory>();

  for (const product of products) {
    if (!product.category_id) continue;
    const current = map.get(product.category_id) ?? { ...EMPTY_INVENTORY };
    current.total += 1;
    const status = getProductInventoryStatus(product);
    if (status === "in_stock") current.inStock += 1;
    else if (status === "low_stock") current.lowStock += 1;
    else current.outOfStock += 1;
    current.available = current.inStock + current.lowStock;
    map.set(product.category_id, current);
  }

  return map;
}

function canNewlySelectCategory(
  category: CategoryPickerItem,
  inventory: CategoryInventory,
  productsLoaded: boolean
) {
  if (category.missing || !category.is_active) return false;
  if (!productsLoaded) return true;
  return inventory.available > 0;
}

function unavailableReason(
  category: CategoryPickerItem,
  inventory: CategoryInventory,
  productsLoaded: boolean
): string | null {
  if (category.missing) return "No longer in category list";
  if (!category.is_active) return "Inactive";
  if (!productsLoaded) return null;
  if (inventory.total === 0) return "0 available products";
  if (inventory.available === 0) return "No available products";
  return null;
}

export function CatalogCategoryPicker({ selectedIds, onChange, disabled }: CatalogCategoryPickerProps) {
  const [categories, setCategories] = useState<AdminCategoryRow[]>([]);
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [categoryRes, productRes] = await Promise.all([
          fetch("/api/admin/categories"),
          fetch("/api/admin/products")
        ]);
        const categoryData = await categoryRes.json();
        const productData = await productRes.json();

        if (!categoryRes.ok) {
          toast.error(categoryData.error ?? "Failed to load categories");
          if (!cancelled) setCategories([]);
        } else if (!cancelled) {
          setCategories(categoryData.categories ?? []);
        }

        if (!productRes.ok) {
          toast.error(productData.error ?? "Failed to load product availability");
          if (!cancelled) {
            setProducts([]);
            setProductsLoaded(false);
          }
        } else if (!cancelled) {
          setProducts(productData.products ?? []);
          setProductsLoaded(true);
        }
      } catch {
        if (!cancelled) {
          toast.error("Failed to load categories");
          setCategories([]);
          setProducts([]);
          setProductsLoaded(false);
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
  const inventoryByCategory = useMemo(() => deriveCategoryInventory(products), [products]);
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );

  const previouslySelectedUnavailable = useMemo(() => {
    const rows: CategoryPickerItem[] = [];
    for (const id of selectedIds) {
      const category = categoryById.get(id);
      const inventory = inventoryByCategory.get(id) ?? EMPTY_INVENTORY;
      if (!category) {
        rows.push(missingCategoryRow(id));
        continue;
      }
      if (!canNewlySelectCategory(category, inventory, productsLoaded)) {
        rows.push(category);
      }
    }
    return rows;
  }, [selectedIds, categoryById, inventoryByCategory, productsLoaded]);

  const previouslySelectedUnavailableIds = useMemo(
    () => new Set(previouslySelectedUnavailable.map((category) => category.id)),
    [previouslySelectedUnavailable]
  );

  const query = search.trim().toLowerCase();
  const filteredAvailable = useMemo(
    () =>
      categories.filter(
        (category) =>
          !previouslySelectedUnavailableIds.has(category.id) &&
          matchesCategorySearch(category, query)
      ),
    [categories, previouslySelectedUnavailableIds, query]
  );
  const filteredSelectedUnavailable = useMemo(
    () =>
      previouslySelectedUnavailable.filter((category) => matchesCategorySearch(category, query)),
    [previouslySelectedUnavailable, query]
  );

  const getInventory = (categoryId: string) =>
    inventoryByCategory.get(categoryId) ?? EMPTY_INVENTORY;

  const toggle = (id: string) => {
    if (disabled) return;
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((item) => item !== id));
      return;
    }
    const category = categoryById.get(id);
    if (!category) return;
    if (!canNewlySelectCategory(category, getInventory(id), productsLoaded)) return;
    onChange([...selectedIds, id]);
  };

  const hasVisibleRows = filteredAvailable.length > 0 || filteredSelectedUnavailable.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground/70">
          <span className="font-semibold text-foreground">{selectedIds.length}</span> categor
          {selectedIds.length === 1 ? "y" : "ies"} selected
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
        placeholder="Search categories…"
        className="w-full rounded-lg border px-3 py-2 text-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        disabled={disabled}
      />

      <div className="max-h-80 overflow-y-auto rounded-lg border bg-white">
        {loading ? (
          <p className="px-3 py-8 text-center text-sm text-foreground/60">Loading categories…</p>
        ) : !hasVisibleRows ? (
          <p className="px-3 py-8 text-center text-sm text-foreground/60">
            {categories.length === 0 ? "No categories found." : "No categories match your search."}
          </p>
        ) : (
          <>
            {filteredSelectedUnavailable.length > 0 ? (
              <div className="border-b border-accent/10">
                <p className="bg-blush/30 px-3 py-2 text-xs font-semibold text-foreground/70">
                  Previously selected — Currently unavailable
                </p>
                <ul>
                  {filteredSelectedUnavailable.map((category) => (
                    <CategoryPickerRow
                      key={category.id}
                      category={category}
                      inventory={getInventory(category.id)}
                      productsLoaded={productsLoaded}
                      checked
                      allowToggle={!disabled}
                      formDisabled={disabled}
                      onToggle={() => toggle(category.id)}
                    />
                  ))}
                </ul>
              </div>
            ) : null}
            {filteredAvailable.length > 0 ? (
              <ul>
                {filteredAvailable.map((category) => {
                  const inventory = getInventory(category.id);
                  const selectable = canNewlySelectCategory(category, inventory, productsLoaded);
                  const checked = selectedSet.has(category.id);
                  return (
                    <CategoryPickerRow
                      key={category.id}
                      category={category}
                      inventory={inventory}
                      productsLoaded={productsLoaded}
                      checked={checked}
                      allowToggle={checked || selectable}
                      formDisabled={disabled}
                      onToggle={() => toggle(category.id)}
                    />
                  );
                })}
              </ul>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function CategoryPickerRow({
  category,
  inventory,
  productsLoaded,
  checked,
  allowToggle,
  formDisabled,
  onToggle
}: {
  category: CategoryPickerItem;
  inventory: CategoryInventory;
  productsLoaded: boolean;
  checked: boolean;
  allowToggle: boolean;
  formDisabled?: boolean;
  onToggle: () => void;
}) {
  const reason = unavailableReason(category, inventory, productsLoaded);
  const locked = formDisabled || !allowToggle;
  const showZeroAvailable = productsLoaded && !category.missing && inventory.total === 0;
  const showReason = Boolean(
    reason &&
      !category.missing &&
      !(showZeroAvailable && reason === "0 available products")
  );

  return (
    <li className="border-b border-accent/10 last:border-b-0">
      <label
        className={`flex items-center gap-3 px-3 py-2 text-sm ${
          checked ? "bg-blush/40" : allowToggle ? "cursor-pointer hover:bg-blush/20" : "cursor-not-allowed"
        } ${formDisabled || !allowToggle ? "opacity-60" : ""}`}
      >
        <input
          type="checkbox"
          className="rounded border-accent/40"
          checked={checked}
          disabled={locked}
          onChange={onToggle}
        />
        <AdminCategoryThumbnail
          src={category.homepage_banner_image_url ?? category.image_url}
          alt={category.name}
        />
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{category.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-foreground/50">
            {category.missing ? (
              <span className="font-medium text-foreground/70">No longer in category list</span>
            ) : showZeroAvailable ? (
              <span>0 available products</span>
            ) : productsLoaded ? (
              <>
                <span>
                  {inventory.total} product{inventory.total === 1 ? "" : "s"}
                </span>
                {inventory.inStock > 0 ? (
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${INVENTORY_STATUS_STYLES.in_stock}`}
                  >
                    {inventory.inStock} In Stock
                  </span>
                ) : null}
                {inventory.lowStock > 0 ? (
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${INVENTORY_STATUS_STYLES.low_stock}`}
                  >
                    {inventory.lowStock} Low Stock
                  </span>
                ) : null}
                {inventory.outOfStock > 0 ? (
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${INVENTORY_STATUS_STYLES.out_of_stock}`}
                  >
                    {inventory.outOfStock} Out of Stock
                  </span>
                ) : null}
              </>
            ) : (
              <span>
                {category.product_count} product{category.product_count === 1 ? "" : "s"}
              </span>
            )}
            {showReason ? <span className="font-medium text-foreground/70">· {reason}</span> : null}
          </span>
        </span>
      </label>
    </li>
  );
}
