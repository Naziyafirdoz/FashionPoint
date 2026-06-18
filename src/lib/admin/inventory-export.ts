export type InventoryExportRow = {
  productName: string;
  sku: string;
  category: string;
  size: string;
  color: string;
  stock: number;
  status: string;
  lastUpdated: string;
};

const CSV_HEADERS = [
  "Product Name",
  "SKU",
  "Category",
  "Size",
  "Color",
  "Stock",
  "Status",
  "Last Updated"
] as const;

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildInventoryExportCsv(rows: InventoryExportRow[]): string {
  const lines = [
    CSV_HEADERS.join(","),
    ...rows.map((row) =>
      [
        row.productName,
        row.sku,
        row.category,
        row.size,
        row.color,
        String(row.stock),
        row.status,
        row.lastUpdated
      ]
        .map((value) => escapeCsvField(value))
        .join(",")
    )
  ];

  return `\uFEFF${lines.join("\r\n")}`;
}

export function inventoryExportFilename(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `inventory-export-${year}-${month}-${day}.csv`;
}

export function downloadInventoryCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
