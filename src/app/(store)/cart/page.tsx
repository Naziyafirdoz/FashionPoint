"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "@/stores/cart";
import { ShippingChargesInfo } from "@/components/store/ShippingChargesInfo";
import { SHIPPING_BEFORE_ADDRESS_MESSAGE } from "@/lib/shipping/display";
import {
  EXPLORE_COLLECTIONS_HREF,
  handleExploreCollectionsClick
} from "@/lib/navigation/explore-collections";
import { useOfferCartQuote } from "@/hooks/useOfferCartQuote";

const STEPS = ["Cart", "Address", "Payment", "Review"];

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal: getSubtotal } = useCartStore();
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const visibleItems = hasHydrated ? items : [];
  const { quote, linesByKey } = useOfferCartQuote(visibleItems);
  const productsTotal = quote?.subtotalBeforeOffers ?? (hasHydrated ? getSubtotal() : 0);
  const visibleDiscount = quote?.totalOfferDiscount ?? 0;
  const total = quote?.subtotalAfterOffers ?? Math.max(0, productsTotal - visibleDiscount);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8 flex flex-wrap gap-2 text-xs">
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={`rounded-full px-3 py-1 ${i === 0 ? "bg-primary text-white" : "bg-blush"}`}
          >
            {s}
          </span>
        ))}
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {visibleItems.length === 0 ? (
            <p className="text-foreground/60">
              Your cart is empty.{" "}
              <Link
                href={EXPLORE_COLLECTIONS_HREF}
                onClick={handleExploreCollectionsClick}
                className="text-primary underline"
              >
                Shop now
              </Link>
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-foreground/60">
                  <th>Product</th>
                  <th>Size</th>
                  <th>Qty</th>
                  <th>Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => {
                  const quoted = linesByKey.get(`${item.productId}::${item.size}::${item.color}`);
                  const lineTotal = quoted?.lineTotal ?? item.price * item.quantity;
                  return (
                    <tr key={`${item.productId}-${item.size}-${item.color}`} className="border-b">
                      <td className="flex items-center gap-3 py-4">
                        <div className="relative h-16 w-12 overflow-hidden rounded bg-blush">
                          {item.image && <Image src={item.image} alt="" fill className="object-cover" />}
                        </div>
                        <span>{item.name}</span>
                      </td>
                      <td>
                        {item.size} / {item.color}
                      </td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          className="w-14 rounded border px-1"
                          onChange={(e) =>
                            updateQuantity(item.productId, item.size, item.color, Number(e.target.value))
                          }
                        />
                      </td>
                      <td>₹{lineTotal.toLocaleString("en-IN")}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId, item.size, item.color)}
                          className="text-red-600"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="card-store h-fit">
          <h2 className="font-bold text-primary">Order Summary</h2>
          <ShippingChargesInfo className="mt-4" />
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>₹{productsTotal.toLocaleString("en-IN")}</dd>
            </div>
            <div className="flex justify-between text-foreground/60">
              <dt>Shipping</dt>
              <dd className="max-w-[10rem] text-right text-xs sm:text-sm">
                {SHIPPING_BEFORE_ADDRESS_MESSAGE}
              </dd>
            </div>
            {visibleDiscount > 0 && (
              <div className="flex justify-between text-green-700">
                <dt>Discount</dt>
                <dd>-₹{visibleDiscount.toLocaleString("en-IN")}</dd>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 font-bold">
              <dt>Total</dt>
              <dd>₹{total.toLocaleString("en-IN")}</dd>
            </div>
          </dl>
          <Link href="/checkout" className="btn-primary mt-6 block w-full text-center">
            PROCEED TO CHECKOUT
          </Link>
        </div>
      </div>
    </div>
  );
}
