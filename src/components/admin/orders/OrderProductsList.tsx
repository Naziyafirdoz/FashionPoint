import Image from "next/image";
import { normalizeOrderItems, formatOrderItemPriceValue } from "@/lib/orders/order-items";
import { formatCurrency } from "@/lib/orders/admin-orders";

type OrderProductsListProps = {
  items: unknown;
  variant?: "admin" | "customer";
};

export function OrderProductsList({ items, variant = "admin" }: OrderProductsListProps) {
  const lines = normalizeOrderItems(items);

  if (lines.length === 0) {
    return (
      <p className="mt-4 text-sm text-foreground/60">No line items recorded for this order.</p>
    );
  }

  return (
    <ul className="mt-4 space-y-4">
      {lines.map((line, index) => (
        <li
          key={`${line.productId}-${line.size}-${line.color}-${index}`}
          className="flex flex-col gap-3 rounded-xl border border-accent/20 bg-blush/20 p-4 sm:flex-row sm:items-start"
        >
          <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg border bg-white">
            {line.image ? (
              <Image
                src={line.image}
                alt={line.name}
                fill
                className="object-cover"
                sizes="80px"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs text-foreground/40">
                No image
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-primary">{line.name}</p>
            <p className="mt-0.5 text-xs text-foreground/50">
              SKU: {line.sku?.trim() || "—"}
            </p>
            <dl
              className={`mt-2 grid gap-x-4 gap-y-1 text-sm ${
                variant === "admin" ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"
              }`}
            >
              <div>
                <dt className="text-foreground/50">Size</dt>
                <dd>{line.size}</dd>
              </div>
              <div>
                <dt className="text-foreground/50">Color</dt>
                <dd>{line.color}</dd>
              </div>
              <div>
                <dt className="text-foreground/50">Quantity</dt>
                <dd>{line.quantity}</dd>
              </div>
              <div className={variant === "admin" ? "sm:col-span-2" : ""}>
                <dt className="text-foreground/50">Price</dt>
                <dd className="font-semibold text-primary">
                  {formatOrderItemPriceValue(line, formatCurrency)}
                </dd>
              </div>
            </dl>
          </div>
        </li>
      ))}
    </ul>
  );
}
