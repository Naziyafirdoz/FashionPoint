"use client";



import Link from "next/link";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { AdminHeader } from "@/components/admin/AdminHeader";

import { AdminProductThumbnail } from "@/components/admin/AdminProductThumbnail";

import { AdminTablePagination } from "@/components/admin/AdminTablePagination";

import { StatsCard } from "@/components/admin/StatsCard";

import type { AdminProductRow } from "@/lib/admin/products";

import {
  buildInventoryExportCsv,
  downloadInventoryCsv,
  inventoryExportFilename,
  type InventoryExportRow
} from "@/lib/admin/inventory-export";
import {
  calculateInventoryStockValue,
  type InventoryRow,
  type InventoryStatus
} from "@/lib/admin/inventory";



const STATUS_STYLES: Record<InventoryStatus, string> = {

  in_stock: "bg-green-100 text-green-800",

  low_stock: "bg-amber-100 text-amber-800",

  out_of_stock: "bg-red-100 text-red-800"

};



const STATUS_LABELS: Record<InventoryStatus, string> = {

  in_stock: "In Stock",

  low_stock: "Low Stock",

  out_of_stock: "Out of Stock"

};



const PAGE_SIZE = 12;

function formatLastUpdated(iso: string | null | undefined) {
  if (!iso) return null;

  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return null;
  }
}

export function AdminInventoryClient() {

  const [rows, setRows] = useState<InventoryRow[]>([]);

  const [products, setProducts] = useState<AdminProductRow[]>([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<"all" | InventoryStatus>("all");

  const [categoryFilter, setCategoryFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);



  useEffect(() => {

    setLoading(true);

    Promise.all([

      fetch("/api/admin/inventory").then((r) => r.json()),

      fetch("/api/admin/products").then((r) => r.json())

    ])

      .then(([inventoryData, productsData]) => {

        setRows(inventoryData.rows ?? []);

        setProducts(productsData.products ?? []);

      })

      .finally(() => setLoading(false));

  }, []);



  const productById = useMemo(

    () => new Map(products.map((p) => [p.id, p])),

    [products]

  );



  const categoryOptions = useMemo(() => {

    const map = new Map<string, string>();

    for (const p of products) {

      if (p.category_id && p.category_name) map.set(p.category_id, p.category_name);

    }

    return Array.from(map.entries())

      .map(([id, name]) => ({ id, name }))

      .sort((a, b) => a.name.localeCompare(b.name));

  }, [products]);



  useEffect(() => {

    setPage(1);

  }, [search, statusFilter, categoryFilter]);



  const filtered = useMemo(() => {

    let result = rows;

    if (statusFilter !== "all") {

      result = result.filter((r) => r.status === statusFilter);

    }

    if (categoryFilter !== "all") {

      result = result.filter((r) => productById.get(r.product_id)?.category_id === categoryFilter);

    }

    const q = search.trim().toLowerCase();

    if (q) {

      result = result.filter((r) => {

        const categoryName = productById.get(r.product_id)?.category_name ?? "";

        return (

          r.product_name.toLowerCase().includes(q) ||

          r.size.toLowerCase().includes(q) ||

          r.color.toLowerCase().includes(q) ||

          (r.sku ?? "").toLowerCase().includes(q) ||

          categoryName.toLowerCase().includes(q)

        );

      });

    }

    return result;

  }, [rows, search, statusFilter, categoryFilter, productById]);



  const summary = useMemo(() => {

    const uniqueProducts = new Set(rows.map((r) => r.product_id));

    const statusCounts = { in_stock: 0, low_stock: 0, out_of_stock: 0 };

    for (const row of rows) {
      statusCounts[row.status]++;
    }

    const stockValue = calculateInventoryStockValue(rows);



    return {

      totalProducts: uniqueProducts.size,

      inStock: statusCounts.in_stock,

      lowStock: statusCounts.low_stock,

      outOfStock: statusCounts.out_of_stock,

      stockValue

    };

  }, [rows]);



  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExport = useCallback(() => {
    if (exporting || loading) return;

    setExporting(true);
    try {
      const exportRows: InventoryExportRow[] = filtered.map((row) => {
        const product = productById.get(row.product_id);
        return {
          productName: row.product_name,
          sku: row.sku ?? "",
          category: product?.category_name ?? "",
          size: row.size,
          color: row.color,
          stock: row.stock_quantity,
          status: STATUS_LABELS[row.status],
          lastUpdated: formatLastUpdated(product?.updated_at) ?? ""
        };
      });

      const csv = buildInventoryExportCsv(exportRows);
      downloadInventoryCsv(csv, inventoryExportFilename());
      toast.success("Inventory exported successfully.");
    } catch {
      toast.error("Failed to export inventory.");
    } finally {
      setExporting(false);
    }
  }, [exporting, loading, filtered, productById]);

  return (

    <>

      <AdminHeader title="Inventory" />

      <div className="space-y-6 p-6">

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

          <StatsCard label="Total Products" value={String(summary.totalProducts)} />

          <StatsCard label="In Stock" value={String(summary.inStock)} />

          <StatsCard label="Low Stock" value={String(summary.lowStock)} />

          <StatsCard label="Out Of Stock" value={String(summary.outOfStock)} />

          <StatsCard

            label="Total Stock Value"

            value={`₹${summary.stockValue.toLocaleString("en-IN")}`}

          />

        </div>



        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex flex-wrap gap-3">

            <input

              type="search"

              placeholder="Search product, SKU, size, color…"

              className="min-w-[200px] flex-1 rounded-lg border px-3 py-2 text-sm"

              value={search}

              onChange={(e) => setSearch(e.target.value)}

            />

            <select

              className="rounded-lg border px-3 py-2 text-sm"

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

            <select

              className="rounded-lg border px-3 py-2 text-sm"

              value={statusFilter}

              onChange={(e) => setStatusFilter(e.target.value as "all" | InventoryStatus)}

            >

              <option value="all">All statuses</option>

              <option value="in_stock">In Stock</option>

              <option value="low_stock">Low Stock</option>

              <option value="out_of_stock">Out of Stock</option>

            </select>

          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={loading || exporting || filtered.length === 0}
            className="btn-outline shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? "Exporting…" : "Export"}
          </button>

        </div>



        <div className="overflow-x-auto rounded-xl border bg-white">

          {loading ? (

            <p className="p-6 text-sm text-foreground/60">Loading inventory…</p>

          ) : filtered.length === 0 ? (

            <p className="p-6 text-sm text-foreground/60">

              No variant rows found. Add products with sizes and colors to populate inventory.

            </p>

          ) : (

            <table className="w-full min-w-[960px] text-sm">

              <thead>

                <tr className="border-b bg-blush/50 text-left text-foreground/70">

                  <th className="p-3">Product</th>

                  <th className="p-3">SKU</th>

                  <th className="p-3">Category</th>

                  <th className="p-3">Variant / Size</th>

                  <th className="p-3">Stock</th>

                  <th className="p-3">Status</th>

                  <th className="p-3">Last Updated</th>

                  <th className="p-3">Actions</th>

                </tr>

              </thead>

              <tbody>

                {paginated.map((row) => {

                  const product = productById.get(row.product_id);

                  return (

                    <tr key={row.id} className="border-b border-accent/10">

                      <td className="p-3">

                        <div className="flex items-center gap-3">

                          <AdminProductThumbnail

                            src={product?.images?.[0]}

                            alt={row.product_name}

                          />

                          <span className="font-medium">{row.product_name}</span>

                        </div>

                      </td>

                      <td className="p-3 font-mono text-xs">{row.sku ?? "—"}</td>

                      <td className="p-3">{product?.category_name ?? "—"}</td>

                      <td className="p-3">

                        {row.size}

                        <span className="text-foreground/50"> · {row.color}</span>

                      </td>

                      <td className="p-3">{row.stock_quantity}</td>

                      <td className="p-3">

                        <span

                          className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[row.status]}`}

                        >

                          {STATUS_LABELS[row.status]}

                        </span>

                      </td>

                      <td className="p-3 whitespace-nowrap text-foreground/70">
                        {formatLastUpdated(product?.updated_at) ?? ""}
                      </td>

                      <td className="p-3">

                        <Link

                          href={`/admin/products/${row.product_id}/edit`}

                          className="text-primary underline"

                        >

                          Edit

                        </Link>

                      </td>

                    </tr>

                  );

                })}

              </tbody>

            </table>

          )}

        </div>



        <AdminTablePagination

          page={page}

          totalPages={totalPages}

          totalItems={filtered.length}

          pageSize={PAGE_SIZE}

          onPageChange={setPage}

        />

      </div>

    </>

  );

}


