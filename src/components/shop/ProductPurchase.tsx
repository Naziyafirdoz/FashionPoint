"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, MessageCircle, Star } from "lucide-react";
import type { Product } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getLowestStock, getStockForSize, isOutOfStock } from "@/lib/products";
import { useCartStore } from "@/stores/cart";
import { useCheckoutSession } from "@/stores/checkout-session";
import { AiSizeHint } from "@/components/ai/AiSizeHint";
import { AiSareeMatchHint } from "@/components/ai/AiSareeMatchHint";
import { STORE_NAME, STORE_WHATSAPP_URL } from "@/lib/site-config";

export function ProductPurchase({ product }: { product: Product }) {
  const [size, setSize] = useState<number>(product.sizes[0] ?? 36);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const startBuyNow = useCheckoutSession((s) => s.startBuyNow);

  const out = isOutOfStock(product);
  const stock = getStockForSize(product, size);
  const low = getLowestStock(product);

  const canBuy = !out && stock > 0;

  return (
    <div className="rounded-[28px] border border-blush-100 bg-white/60 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-[family-name:var(--font-display)] text-3xl text-maroon leading-tight">
            {product.name}
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-maroon/70">
            <Star className="h-4 w-4 text-lightGold" />
            {product.rating.toFixed(1)} ({product.reviewCount})
          </div>
        </div>
        {out ? (
          <Badge variant="danger">Out of stock</Badge>
        ) : low > 0 && low <= 2 ? (
          <Badge variant="gold">Only {low} left</Badge>
        ) : (
          <Badge>In stock</Badge>
        )}
      </div>

      <div className="mt-5 flex items-baseline justify-between">
        <div className="text-2xl font-semibold text-maroon">
          ₹{product.priceInr.toLocaleString("en-IN")}
        </div>
      </div>

      <div className="mt-6">
        <div className="text-sm font-semibold text-maroon">Select size</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {product.sizes.map((s) => {
            const disabled = (product.stockBySize[s] ?? 0) <= 0;
            return (
              <button
                key={s}
                onClick={() => setSize(s)}
                disabled={disabled}
                className={[
                  "h-10 rounded-full px-4 border text-sm transition",
                  s === size
                    ? "border-roseGold/60 bg-blush-100 text-maroon"
                    : "border-blush-100 bg-white/70 text-maroon/80 hover:bg-white",
                  disabled ? "opacity-40 line-through cursor-not-allowed" : ""
                ].join(" ")}
              >
                {s}
              </button>
            );
          })}
        </div>
        <div className="mt-2 text-xs text-maroon/55">
          {stock > 0 ? `${stock} available in size ${size}` : "Not available in this size"}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <AiSizeHint product={product} />
          <AiSareeMatchHint product={product} />
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button
          disabled={!canBuy}
          onClick={() => addItem({ productId: product.id, name: product.name, price: product.priceInr, size: String(size), color: product.colors[0] ?? 'Default', quantity: 1, image: product.images[0]?.src ?? '', slug: product.slug })}
        >
          Add to cart
        </Button>
        <Button
          disabled={!canBuy}
          variant="outline"
          onClick={() => {
            startBuyNow({
              productId: product.id,
              name: product.name,
              price: product.priceInr,
              size: String(size),
              color: product.colors[0] ?? "Default",
              quantity: 1,
              image: product.images[0]?.src ?? "",
              slug: product.slug
            });
            router.push("/checkout?mode=buy_now");
          }}
        >
          Buy now
        </Button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-blush-100 bg-white/70 p-4">
        <div>
          <div className="text-sm font-semibold text-maroon">
            WhatsApp order option
          </div>
          <div className="text-xs text-maroon/60">
            Order directly on WhatsApp (demo link).
          </div>
        </div>
        <a
          href={`${STORE_WHATSAPP_URL}?text=${encodeURIComponent(`Hi ${STORE_NAME}, I want to order this blouse.`)}`}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 border border-blush-100 bg-white/80 hover:bg-white transition text-sm text-maroon"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>
      </div>

      <div className="mt-6">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between rounded-2xl border border-blush-100 bg-white/70 px-4 py-3 text-sm text-maroon"
        >
          <span>Full description & details</span>
          <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
        </button>
        {open ? (
          <div className="mt-3 rounded-2xl border border-blush-100 bg-white/70 p-4 text-sm text-maroon/75">
            <div className="font-semibold text-maroon">Short description</div>
            <p className="mt-1">{product.shortDescription}</p>
            <div className="mt-4 font-semibold text-maroon">Fabric</div>
            <p className="mt-1">{product.fabrics.join(" · ")}</p>
            <div className="mt-4 font-semibold text-maroon">Details</div>
            <p className="mt-1">{product.description}</p>
            <div className="mt-4 font-semibold text-maroon">
              Payment & checkout
            </div>
            <p className="mt-1">
              Razorpay / UPI / Cards / COD are prepared in the checkout stub.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

