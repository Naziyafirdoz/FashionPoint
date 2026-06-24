"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildInventoryExportCsv, type InventoryExportRow } from "@/lib/admin/inventory-export";
import type { InventoryRow } from "@/lib/admin/inventory";
import type { AdminProductRow } from "@/lib/admin/products";
import type { AdminReviewRow } from "@/lib/admin/reviews";
import {
  buildCsv,
  downloadCsv,
  downloadExcelTable,
  exportFilename
} from "@/lib/admin/reports-export";
import {
  buildReportsQueryString,
  DEFAULT_REPORT_RANGE,
  EXPORT_RANGE_OPTIONS,
  parseReportsQueryState,
  type ReportsRangeKey
} from "@/lib/admin/reports-params";
import type { OrderReportRow } from "@/lib/admin/reports";
import { ReportsDateFilter } from "@/components/admin/reports/ReportsToolbar";
import { ReportsPageShell, ReportsSection } from "@/components/admin/reports/reports-shared";

async function fetchExportDataset(
  dataset: "orders" | "products" | "inventory" | "reviews",
  queryString: string
) {
  const res = await fetch(`/api/admin/reports/export?dataset=${dataset}&${queryString}`, {
    cache: "no-store"
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Export failed");
  }
  return json;
}

function inventoryRowsToExport(rows: InventoryRow[]): InventoryExportRow[] {
  return rows.map((row) => ({
    productName: row.product_name,
    sku: row.sku ?? "",
    category: "",
    size: row.size,
    color: row.color,
    stock: row.stock_quantity,
    status: row.status.replace(/_/g, " "),
    lastUpdated: new Date().toISOString()
  }));
}

export function ExportCenterClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = useMemo(() => parseReportsQueryState(searchParams), [searchParams]);
  const [exporting, setExporting] = useState<string | null>(null);

  const updateRange = (patch: { range?: ReportsRangeKey; from?: string; to?: string }) => {
    const qs = buildReportsQueryString({ ...patch, page: 1 }, query);
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const runExport = async (key: string, handler: () => Promise<void>) => {
    setExporting(key);
    try {
      await handler();
      toast.success("Export ready");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setExporting(null);
    }
  };

  const queryString = buildReportsQueryString({}, query);

  const exportOrders = async (format: "csv" | "xlsx") => {
    const data = await fetchExportDataset("orders", queryString);
    const rows = (data.rows ?? []) as OrderReportRow[];
    const headers = ["Order ID", "Customer", "Date", "Status", "Amount"];
    const exportRows = rows.map((row) => [
      row.orderNumber,
      row.customer,
      row.dateLabel,
      row.statusLabel,
      String(row.amount)
    ]);

    if (format === "csv") {
      downloadCsv(buildCsv(headers, exportRows), exportFilename("orders-export", "csv"));
      return;
    }

    downloadExcelTable(headers, exportRows, exportFilename("orders-export", "xls"));
  };

  const exportProducts = async (format: "csv" | "xlsx") => {
    const data = await fetchExportDataset("products", queryString);
    const products = (data.products ?? []) as AdminProductRow[];
    const headers = ["Product", "SKU", "Category", "Price", "Stock", "Status", "Featured"];
    const rows = products.map((product) => [
      product.name,
      product.slug,
      product.category_name ?? "",
      String(product.price),
      String(product.total_stock),
      product.status,
      product.is_featured ? "Yes" : "No"
    ]);

    if (format === "csv") {
      downloadCsv(buildCsv(headers, rows), exportFilename("products-export", "csv"));
      return;
    }

    downloadExcelTable(headers, rows, exportFilename("products-export", "xls"));
  };

  const exportInventory = async (format: "csv" | "xlsx") => {
    const data = await fetchExportDataset("inventory", queryString);
    const inventory = (data.rows ?? []) as InventoryRow[];
    const exportRows = inventoryRowsToExport(inventory);

    if (format === "csv") {
      downloadCsv(buildInventoryExportCsv(exportRows), exportFilename("inventory-export", "csv"));
      return;
    }

    const headers = [
      "Product Name",
      "SKU",
      "Category",
      "Size",
      "Color",
      "Stock",
      "Status",
      "Last Updated"
    ];
    const rows = exportRows.map((row) => [
      row.productName,
      row.sku,
      row.category,
      row.size,
      row.color,
      String(row.stock),
      row.status,
      row.lastUpdated
    ]);
    downloadExcelTable(headers, rows, exportFilename("inventory-export", "xls"));
  };

  const exportReviews = async (format: "csv" | "xlsx") => {
    const data = await fetchExportDataset("reviews", queryString);
    const reviews = (data.reviews ?? []) as AdminReviewRow[];
    const headers = ["Product", "Customer", "Rating", "Status", "Verified Purchase", "Date", "Review"];
    const rows = reviews.map((review) => [
      review.product_name,
      review.customer_name,
      String(review.rating),
      review.status,
      review.is_verified_purchase ? "Yes" : "No",
      new Date(review.created_at).toLocaleString("en-IN"),
      review.body ?? review.title ?? ""
    ]);

    if (format === "csv") {
      downloadCsv(buildCsv(headers, rows), exportFilename("reviews-export", "csv"));
      return;
    }

    downloadExcelTable(headers, rows, exportFilename("reviews-export", "xls"));
  };

  const csvButtons = [
    { key: "orders-csv", label: "Export Orders CSV", action: () => exportOrders("csv") },
    { key: "products-csv", label: "Export Products CSV", action: () => exportProducts("csv") },
    { key: "inventory-csv", label: "Export Inventory CSV", action: () => exportInventory("csv") },
    { key: "reviews-csv", label: "Export Reviews CSV", action: () => exportReviews("csv") }
  ] as const;

  const excelButtons = [
    { key: "orders-xls", label: "Export Orders Excel", action: () => exportOrders("xlsx") },
    { key: "products-xls", label: "Export Products Excel", action: () => exportProducts("xlsx") },
    { key: "inventory-xls", label: "Export Inventory Excel", action: () => exportInventory("xlsx") },
    { key: "reviews-xls", label: "Export Reviews Excel", action: () => exportReviews("xlsx") }
  ] as const;

  const rangeToolbar = (
    <ReportsDateFilter
      query={{ ...query, range: query.range || DEFAULT_REPORT_RANGE }}
      onChange={updateRange}
      options={EXPORT_RANGE_OPTIONS}
    />
  );

  return (
    <ReportsPageShell title="Export Center" action={rangeToolbar}>
      <div className="grid gap-4 lg:grid-cols-2">
        <ReportsSection title="CSV Exports">
          <div className="grid gap-2">
            {csvButtons.map((button) => (
              <button
                key={button.key}
                type="button"
                className="btn-primary justify-center"
                disabled={exporting !== null}
                onClick={() => void runExport(button.key, button.action)}
              >
                {exporting === button.key ? "Exporting…" : button.label}
              </button>
            ))}
          </div>
        </ReportsSection>

        <ReportsSection title="Excel Exports">
          <div className="grid gap-2">
            {excelButtons.map((button) => (
              <button
                key={button.key}
                type="button"
                className="btn-primary justify-center"
                disabled={exporting !== null}
                onClick={() => void runExport(button.key, button.action)}
              >
                {exporting === button.key ? "Exporting…" : button.label}
              </button>
            ))}
          </div>
        </ReportsSection>
      </div>
    </ReportsPageShell>
  );
}
