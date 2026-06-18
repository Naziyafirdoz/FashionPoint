"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminProductThumbnail } from "@/components/admin/AdminProductThumbnail";
import {
  filterAdminProducts,
  getProductStatus,
  type AdminProductRow
} from "@/lib/admin/products";
import type { Category } from "@/types";

const STATUS_STYLES = {
  active: "bg-green-100 text-green-800",
  out_of_stock: "bg-orange-100 text-orange-800",
  draft: "bg-gray-100 text-gray-700",
  archived: "bg-red-100 text-red-800"
} as const;

const STATUS_LABELS = {
  active: "Active",
  out_of_stock: "Out of Stock",
  draft: "Draft",
  archived: "Archived"
} as const;

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch {
    return "—";
  }
}

function formatPrice(price: number) {
  return `₹${price.toLocaleString("en-IN")}`;
}

function AdminProductsContent() {
  const searchParams = useSearchParams();
  const featuredOnly = searchParams.get("featured") === "true";

  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products");
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to load products");
        setProducts([]);
        return;
      }
      setProducts(data.products ?? []);
    } catch {
      toast.error("Failed to load products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(Array.isArray(d.categories) ? d.categories : []))
      .catch(() => setCategories([]));
  }, [loadProducts]);

  const scopedProducts = useMemo(
    () => (featuredOnly ? products.filter((p) => p.is_featured) : products),
    [products, featuredOnly]
  );

  const filtered = useMemo(
    () => filterAdminProducts(scopedProducts, search, categoryFilter),
    [scopedProducts, search, categoryFilter]
  );

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) map.set(c.id, c.name);
    for (const p of scopedProducts) {
      if (p.category_id && p.category_name) map.set(p.category_id, p.category_name);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, scopedProducts]);

  const handleDelete = async (product: AdminProductRow) => {
    const confirmed = window.confirm(
      `Delete ${product.name}? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(product.id);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to delete product");
        return;
      }
      toast.success("Product deleted");
      await loadProducts();
    } catch {
      toast.error("Failed to delete product");
    } finally {
      setDeletingId(null);
    }
  };

  const pageTitle = featuredOnly ? "Featured Products" : "Products";

  return (
    <>
      <AdminHeader title={pageTitle} />
      <div className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground/80">
            <span className="font-semibold text-foreground">{filtered.length}</span>
            {filtered.length !== scopedProducts.length
              ? ` of ${scopedProducts.length} products`
              : ` product${filtered.length === 1 ? "" : "s"}`}
          </p>
          <Link href="/admin/products/new" className="btn-primary text-center">
            ADD NEW PRODUCT
          </Link>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            placeholder="Search by product name…"
            className="w-full rounded-lg border px-3 py-2 text-sm sm:max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm sm:max-w-xs"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All categories</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b bg-blush/50 text-left text-foreground/70">
                <th className="p-3 pr-4">Product</th>
                <th className="p-3 pr-4">Category</th>
                <th className="p-3 pr-4">Price</th>
                <th className="p-3 pr-4">Stock</th>
                <th className="p-3 pr-4">Status</th>
                <th className="p-3 pr-4">Created</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-foreground/60">
                    Loading products…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-foreground/60">
                    {scopedProducts.length === 0
                      ? featuredOnly
                        ? "No featured products yet. Mark products as featured when editing."
                        : "No products yet. Add your first product."
                      : "No products match your filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const status = getProductStatus(p);
                  return (
                    <tr key={p.id} className="border-b border-accent/10">
                      <td className="p-3 pr-4">
                        <div className="flex items-center gap-3">
                          <AdminProductThumbnail src={p.images[0]} alt={p.name} />
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </td>
                      <td className="p-3 pr-4">{p.category_name ?? "—"}</td>
                      <td className="p-3 pr-4">{formatPrice(p.price)}</td>
                      <td className="p-3 pr-4">{p.total_stock}</td>
                      <td className="p-3 pr-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}
                        >
                          {STATUS_LABELS[status] ?? status}
                        </span>
                      </td>
                      <td className="p-3 pr-4 whitespace-nowrap">{formatDate(p.created_at)}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-3">
                          <Link
                            href={`/admin/products/${p.id}/edit`}
                            className="text-primary underline"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            disabled={deletingId === p.id}
                            onClick={() => handleDelete(p)}
                            className="text-red-600 underline disabled:opacity-50"
                          >
                            {deletingId === p.id ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function AdminProductsFallback() {
  return (
    <>
      <AdminHeader title="Products" />
      <div className="p-6 text-sm text-foreground/60">Loading products…</div>
    </>
  );
}

export function AdminProductsClient() {
  return (
    <Suspense fallback={<AdminProductsFallback />}>
      <AdminProductsContent />
    </Suspense>
  );
}
