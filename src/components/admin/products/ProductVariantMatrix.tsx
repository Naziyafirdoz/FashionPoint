"use client";

import toast from "react-hot-toast";
import type { AdminVariantMatrixRow } from "@/lib/admin/products";
import { variantMatrixKey } from "@/lib/admin/products";

type ProductVariantMatrixProps = {
  variants: AdminVariantMatrixRow[];
  onChange: (variants: AdminVariantMatrixRow[]) => void;
};

export function ProductVariantMatrix({ variants, onChange }: ProductVariantMatrixProps) {
  const updateVariant = (size: string, color: string, patch: Partial<AdminVariantMatrixRow>) => {
    onChange(
      variants.map((v) => (v.size === size && v.color === color ? { ...v, ...patch } : v))
    );
  };

  const markAllOutOfStock = () => {
    onChange(variants.map((v) => ({ ...v, stock_quantity: 0 })));
    toast.success("All variants marked out of stock");
  };

  if (variants.length === 0) {
    return (
      <p className="text-sm text-foreground/60">Select colors and sizes to manage the inventory matrix.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-foreground/50">
          Set price, compare price, stock, and SKU per size/color combination.
        </p>
        <button
          type="button"
          onClick={markAllOutOfStock}
          className="text-xs font-semibold text-red-600 underline"
        >
          Mark all out of stock
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-foreground/70">
              <th className="py-2 pr-3">Size</th>
              <th className="py-2 pr-3">Color</th>
              <th className="py-2 pr-3">Price (₹)</th>
              <th className="py-2 pr-3">Compare Price (₹)</th>
              <th className="py-2 pr-3">Stock</th>
              <th className="py-2">SKU</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((row) => (
              <tr key={variantMatrixKey(row.size, row.color)} className="border-b border-accent/10">
                <td className="py-2 pr-3 font-medium">{row.size}</td>
                <td className="py-2 pr-3">{row.color}</td>
                <td className="py-2 pr-3">
                  <input
                    type="number"
                    min={0}
                    className="w-24 rounded border px-2 py-1"
                    value={row.price}
                    onChange={(e) =>
                      updateVariant(row.size, row.color, {
                        price: Math.max(0, Number(e.target.value) || 0)
                      })
                    }
                  />
                </td>
                <td className="py-2 pr-3">
                  <input
                    type="number"
                    min={0}
                    className="w-24 rounded border px-2 py-1"
                    value={row.compare_price ?? ""}
                    placeholder="—"
                    onChange={(e) =>
                      updateVariant(row.size, row.color, {
                        compare_price:
                          e.target.value === "" ? null : Math.max(0, Number(e.target.value) || 0)
                      })
                    }
                  />
                </td>
                <td className="py-2 pr-3">
                  <input
                    type="number"
                    min={0}
                    className="w-20 rounded border px-2 py-1"
                    value={row.stock_quantity}
                    onChange={(e) =>
                      updateVariant(row.size, row.color, {
                        stock_quantity: Math.max(0, Number(e.target.value) || 0)
                      })
                    }
                  />
                </td>
                <td className="py-2">
                  <input
                    type="text"
                    className="w-full min-w-[120px] rounded border px-2 py-1"
                    value={row.sku}
                    placeholder="SKU"
                    onChange={(e) => updateVariant(row.size, row.color, { sku: e.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
