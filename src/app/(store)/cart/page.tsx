"use client";

import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "@/stores/cart";
import { ShippingChargesInfo } from "@/components/store/ShippingChargesInfo";
import { SHIPPING_BEFORE_ADDRESS_MESSAGE } from "@/lib/shipping/display";
const STEPS = ["Cart", "Address", "Payment", "Review"];

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal: getSubtotal, discount } = useCartStore();

  const productsTotal = getSubtotal();
  const total = Math.max(0, productsTotal - discount);

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
          {items.length === 0 ? (
            <p className="text-foreground/60">
              Your cart is empty.{" "}
              <Link href="/daily-wear" className="text-primary underline">
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
                {items.map((item) => (
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
                    <td>₹{(item.price * item.quantity).toLocaleString("en-IN")}</td>
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
                ))}
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
            {discount > 0 && (
              <div className="flex justify-between text-green-700">
                <dt>Discount</dt>
                <dd>-₹{discount.toLocaleString("en-IN")}</dd>
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
