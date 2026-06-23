"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { normalizeOrderItems, formatOrderItemPriceValue } from "@/lib/orders/order-items";
import { formatCurrency } from "@/lib/orders/admin-orders";
import { OrderProductImageLightbox } from "@/components/admin/orders/detail/OrderProductImageLightbox";

type OrderProductsListProps = {
  items: unknown;
  variant?: "admin" | "customer";
};

export function OrderProductsList({ items, variant = "admin" }: OrderProductsListProps) {
  const lines = normalizeOrderItems(items);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const lightboxImages = useMemo(
    () =>
      lines
        .filter((line) => line.image)
        .map((line) => ({ src: line.image!, alt: line.name })),
    [lines]
  );

  if (lines.length === 0) {
    return (
      <p className="text-sm text-foreground/60">No line items recorded for this order.</p>
    );
  }

  const openLightbox = (imageUrl: string) => {
    const idx = lightboxImages.findIndex((img) => img.src === imageUrl);
    if (idx >= 0) setLightboxIndex(idx);
  };

  return (
    <>
      <ul className="space-y-3">
        {lines.map((line, index) => (
          <li
            key={`${line.productId}-${line.size}-${line.color}-${index}`}
            className={
              variant === "admin"
                ? "flex flex-col gap-4 rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm sm:flex-row sm:items-start"
                : "flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4 sm:flex-row sm:items-start"
            }
          >
            <button
              type="button"
              className={
                variant === "admin"
                  ? "relative h-36 w-32 shrink-0 overflow-hidden rounded-lg border border-rose-200 bg-white shadow-sm transition hover:ring-2 hover:ring-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  : "relative h-24 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
              }
              onClick={() => line.image && variant === "admin" && openLightbox(line.image)}
              disabled={!line.image || variant !== "admin"}
              aria-label={line.image ? `View ${line.name} image` : undefined}
            >
              {line.image ? (
                <Image
                  src={line.image}
                  alt={line.name}
                  fill
                  className={`object-cover ${variant === "admin" ? "cursor-zoom-in" : ""}`}
                  sizes={variant === "admin" ? "128px" : "80px"}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xs text-foreground/40">
                  No image
                </span>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p
                className={
                  variant === "admin"
                    ? "text-base font-semibold leading-snug text-gray-900"
                    : "font-medium text-primary"
                }
              >
                {line.name}
              </p>
              <p
                className={
                  variant === "admin"
                    ? "mt-1 text-xs font-medium uppercase tracking-wide text-gray-500"
                    : "mt-0.5 text-xs text-foreground/50"
                }
              >
                SKU: {line.sku?.trim() || "—"}
              </p>
              <dl
                className={`mt-3 grid gap-x-6 gap-y-2 text-sm ${
                  variant === "admin" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"
                }`}
              >
                <div>
                  <dt className={variant === "admin" ? "text-xs text-gray-500" : "text-foreground/50"}>
                    Size
                  </dt>
                  <dd className={variant === "admin" ? "font-medium text-gray-900" : undefined}>
                    {line.size}
                  </dd>
                </div>
                <div>
                  <dt className={variant === "admin" ? "text-xs text-gray-500" : "text-foreground/50"}>
                    Color
                  </dt>
                  <dd className={variant === "admin" ? "font-medium text-gray-900" : undefined}>
                    {line.color}
                  </dd>
                </div>
                <div>
                  <dt className={variant === "admin" ? "text-xs text-gray-500" : "text-foreground/50"}>
                    Quantity
                  </dt>
                  <dd className={variant === "admin" ? "font-medium text-gray-900" : undefined}>
                    {line.quantity}
                  </dd>
                </div>
                <div>
                  <dt className={variant === "admin" ? "text-xs text-gray-500" : "text-foreground/50"}>
                    Price
                  </dt>
                  <dd className="text-base font-bold text-primary">
                    {formatOrderItemPriceValue(line, formatCurrency)}
                  </dd>
                </div>
              </dl>
            </div>
          </li>
        ))}
      </ul>

      {lightboxIndex != null && lightboxImages.length > 0 ? (
        <OrderProductImageLightbox
          images={lightboxImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      ) : null}
    </>
  );
}
