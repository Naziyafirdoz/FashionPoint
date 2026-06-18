"use client";

import Image from "next/image";
import Link from "next/link";
import { normalizeOrderItems } from "@/lib/orders/order-items";

type OrderItemThumbnailsProps = {
  items: unknown;
  orderId: string;
  max?: number;
  size?: number;
};

export function OrderItemThumbnails({
  items,
  orderId,
  max = 3,
  size = 40
}: OrderItemThumbnailsProps) {
  const lines = normalizeOrderItems(items).slice(0, max);

  if (lines.length === 0) {
    return <span className="text-foreground/40">—</span>;
  }

  return (
    <div className="flex items-center gap-1.5">
      {lines.map((line, index) => (
        <Link
          key={`${line.productId}-${line.size}-${index}`}
          href={`/admin/orders/${orderId}`}
          className="relative shrink-0 overflow-hidden rounded-md border border-accent/20 bg-blush/40 transition hover:ring-2 hover:ring-primary/30"
          style={{ width: size, height: size }}
          title={line.name}
        >
          {line.image ? (
            <Image
              src={line.image}
              alt={line.name}
              fill
              className="object-cover"
              sizes={`${size}px`}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[10px] text-foreground/40">
              —
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
