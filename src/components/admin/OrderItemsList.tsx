import { normalizeOrderItems, formatOrderItemPriceLine } from "@/lib/orders/order-items";

type OrderItemsListProps = {
  items: unknown;
};

export function OrderItemsList({ items }: OrderItemsListProps) {
  const lines = normalizeOrderItems(items);

  if (lines.length === 0) {
    return (
      <p className="mt-4 text-sm text-foreground/60">No line items recorded for this order.</p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm font-semibold text-foreground/80">Items</p>
      <ul className="space-y-3">
        {lines.map((line, index) => (
          <li
            key={`${line.productId}-${line.size}-${line.color}-${index}`}
            className="rounded-lg border bg-blush/30 p-3 text-sm"
          >
            <p className="font-medium text-primary">
              {line.name}
              {line.color && line.color !== "—" ? ` - ${line.color}` : ""}
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-foreground/80">
              <div>
                <dt className="text-foreground/50">Size</dt>
                <dd>{line.size}</dd>
              </div>
              <div>
                <dt className="text-foreground/50">Color</dt>
                <dd>{line.color}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-foreground/50">Qty</dt>
                <dd>{line.quantity}</dd>
              </div>
            </dl>
            <p className="mt-2 text-right font-medium">
              {formatOrderItemPriceLine(line)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
