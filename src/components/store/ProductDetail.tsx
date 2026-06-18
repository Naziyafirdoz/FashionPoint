"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, ZoomIn } from "lucide-react";
import toast from "react-hot-toast";
import type { Product } from "@/types";
import { useCartStore } from "@/stores/cart";
import { useCheckoutSession } from "@/stores/checkout-session";
import { ProductGrid } from "./ProductGrid";
import { ProductImage } from "./ProductImage";
import { OutOfStockModal } from "./OutOfStockModal";
import { MOCK_PRODUCTS } from "@/lib/mock-data";
import { ProductReviewsPanel } from "@/components/reviews/ProductReviewsPanel";
import { ReviewStars } from "@/components/reviews/ReviewStars";
import type { ProductReviewSummary } from "@/lib/reviews/types";
import {
  discountPercent,
  isSizeUnavailableForColor,
  resolveVariantDisplay
} from "@/lib/products/variants";

const SIZES = ["XS(32)", "S(34)", "M(36)", "L(38)", "XL(40)", "XXL(42)"];

export function ProductDetail({ product }: { product: Product }) {
  const sizeOptions = product.sizes?.length ? product.sizes : SIZES;
  const defaultColor = product.colors?.[0] ?? "Pink";
  const defaultSize =
    sizeOptions.find((s) => !isSizeUnavailableForColor(product, s, defaultColor)) ??
    sizeOptions[0] ??
    SIZES[2];

  const [size, setSize] = useState(defaultSize);
  const [color, setColor] = useState(defaultColor);
  const [tab, setTab] = useState("DESCRIPTION");
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [reviewSummary, setReviewSummary] = useState<ProductReviewSummary>({
    average_rating: 0,
    review_count: 0
  });
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const startBuyNow = useCheckoutSession((s) => s.startBuyNow);

  const selection = useMemo(
    () => resolveVariantDisplay(product, size, color),
    [product, size, color]
  );

  const outOfStock = !selection.inStock;
  const discount = discountPercent(selection.price, selection.compare_price);

  useEffect(() => {
    if (!isSizeUnavailableForColor(product, size, color)) return;
    const available = sizeOptions.find((s) => !isSizeUnavailableForColor(product, s, color));
    if (available && available !== size) {
      setSize(available);
    }
  }, [color, product, size, sizeOptions]);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/reviews?product_id=${encodeURIComponent(product.id)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.summary) {
          setReviewSummary(data.summary);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [product.id]);

  const handleAdd = () => {
    if (outOfStock) {
      toast.error("This variant is out of stock");
      return;
    }
    addItem({
      productId: product.id,
      name: product.name,
      price: selection.price,
      size,
      color,
      quantity: 1,
      image: product.images?.[0] ?? "",
      slug: product.slug
    });
    toast.success("Added to cart");
  };

  const handleBuyNow = () => {
    if (outOfStock) {
      toast.error("This variant is out of stock");
      return;
    }
    startBuyNow({
      productId: product.id,
      name: product.name,
      price: selection.price,
      size,
      color,
      quantity: 1,
      image: product.images?.[0] ?? "",
      slug: product.slug
    });
    router.push("/checkout?mode=buy_now");
  };

  const tabs = [
    "DESCRIPTION",
    "DETAILS",
    "SIZE GUIDE",
    "SHIPPING",
    `REVIEWS (${reviewSummary.review_count})`
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="mb-6 text-sm text-foreground/60">
        <Link href="/">Home</Link> / <Link href="/designer-wear">Category</Link> / {product.name}
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="flex gap-4">
          <div className="hidden flex-col gap-2 sm:flex">
            {(product.images ?? []).slice(0, 4).map((img, i) => (
              <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                <ProductImage src={img} alt="" sizes="80px" />
              </div>
            ))}
          </div>
          <div className="relative aspect-[3/4] flex-1 overflow-hidden rounded-2xl bg-blush">
            {product.images?.[0] && (
              <ProductImage src={product.images[0]} alt={product.name} priority sizes="(max-width: 1024px) 100vw, 50vw" />
            )}
            <button type="button" className="absolute right-3 top-3 rounded-full bg-white/90 p-2">
              <ZoomIn className="h-5 w-5" />
            </button>
            <button type="button" className="absolute left-3 top-3 rounded-full bg-white/90 p-2">
              <Heart className="h-5 w-5 text-primary" />
            </button>
          </div>
        </div>

        <div>
          {product.is_bestseller && (
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">BESTSELLER</span>
          )}
          <h1 className="mt-2 font-display text-2xl font-bold text-primary md:text-3xl">{product.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-1 text-sm">
            {reviewSummary.review_count > 0 ? (
              <>
                <ReviewStars rating={reviewSummary.average_rating} showValue />
                <span className="text-foreground/70">
                  ({reviewSummary.review_count} Review{reviewSummary.review_count === 1 ? "" : "s"})
                </span>
              </>
            ) : (
              <span className="text-foreground/70">No reviews yet</span>
            )}
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-2xl font-bold text-primary">
              ₹{selection.price.toLocaleString("en-IN")}
            </span>
            {selection.compare_price && selection.compare_price > selection.price && (
              <>
                <span className="text-lg text-foreground/50 line-through">
                  ₹{selection.compare_price.toLocaleString("en-IN")}
                </span>
                <span className="rounded bg-accent/20 px-2 py-0.5 text-sm font-bold text-primary">
                  {discount}% OFF
                </span>
              </>
            )}
          </div>

          <p className="mt-2 text-sm text-foreground/70">
            {outOfStock ? (
              <span className="font-medium text-red-600">Out of stock</span>
            ) : selection.stock_quantity <= 5 ? (
              <span className="font-medium text-amber-700">
                Only {selection.stock_quantity} left in stock
              </span>
            ) : (
              <span className="text-green-700">In stock</span>
            )}
            {selection.sku && (
              <span className="text-foreground/50"> · SKU: {selection.sku}</span>
            )}
          </p>

          <p className="mt-4 text-foreground/80">{product.short_description}</p>

          <div className="mt-6">
            <p className="text-sm font-semibold">COLOR</p>
            <div className="mt-2 flex gap-2">
              {(product.colors ?? []).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full border-2 ${color === c ? "border-primary ring-2 ring-primary" : "border-gray-200"}`}
                  style={{ background: c.toLowerCase() }}
                  title={c}
                />
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">SIZE</p>
              <Link href="/size-guide" className="text-xs text-primary underline">Size Guide</Link>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {sizeOptions.map((s) => {
                const disabled = isSizeUnavailableForColor(product, s, color);
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={disabled}
                    title={disabled ? "Out of stock" : undefined}
                    onClick={() => setSize(s)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                      disabled
                        ? "cursor-not-allowed border border-accent/20 opacity-50 line-through"
                        : size === s
                          ? "bg-primary text-white"
                          : "border border-accent/40"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div><dt className="text-foreground/60">FABRIC</dt><dd>{product.fabric}</dd></div>
            <div><dt className="text-foreground/60">NECK TYPE</dt><dd>{product.neck_type}</dd></div>
            <div><dt className="text-foreground/60">SLEEVE TYPE</dt><dd>{product.sleeve_type}</dd></div>
            <div><dt className="text-foreground/60">CLOSURE</dt><dd>{product.closure_type}</dd></div>
          </dl>

          {outOfStock ? (
            <>
              <button type="button" disabled className="mt-6 w-full rounded-full bg-foreground/30 py-3 font-bold text-white">
                OUT OF STOCK
              </button>
              <p className="mt-2 text-sm text-foreground/70">Want to buy this? Notify me on WhatsApp when available</p>
              <button type="button" onClick={() => setNotifyOpen(true)} className="btn-primary mt-3 w-full">
                NOTIFY ME
              </button>
            </>
          ) : (
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={handleAdd} className="btn-primary flex-1">
                ADD TO CART
              </button>
              <button type="button" onClick={handleBuyNow} className="btn-outline flex-1">
                BUY NOW
              </button>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-2 text-xs text-foreground/70 sm:grid-cols-4">
            {["Secure Payments", "Quality Assured", "AI Size Finder", "Trusted Brand"].map((t) => (
              <span key={t} className="rounded-lg bg-blush px-2 py-2 text-center">{t}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-12 border-b">
        <div className="flex gap-4 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t.split(" ")[0])}
              className={`whitespace-nowrap border-b-2 px-2 py-3 text-sm font-medium ${tab.startsWith(t.split(" ")[0]) ? "border-primary text-primary" : "border-transparent"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="py-6 text-sm text-foreground/80">
          {tab === "DESCRIPTION" && <p>{product.detailed_description ?? product.short_description}</p>}
          {tab === "DETAILS" && (
            <p>
              SKU: {selection.sku ?? product.sku ?? "—"} · Tags: {product.tags?.join(", ") || "—"}
            </p>
          )}
          {tab === "SIZE" && <p>Refer to our <Link href="/size-guide" className="text-primary underline">size guide</Link>.</p>}
          {tab === "SHIPPING" && (
            <p>
              Shipping charges are calculated automatically at checkout based on your delivery
              address. Enter your address during checkout to see the applicable shipping charge.
            </p>
          )}
          {tab === "REVIEWS" && (
            <ProductReviewsPanel
              productId={product.id}
              productName={product.name}
              onSummaryChange={setReviewSummary}
            />
          )}
        </div>
      </div>

      <section className="mt-12">
        <h2 className="font-display text-xl font-bold text-primary">YOU MAY ALSO LIKE</h2>
        <ProductGrid products={MOCK_PRODUCTS.filter((p) => p.id !== product.id).slice(0, 4)} />
      </section>

      <OutOfStockModal open={notifyOpen} onClose={() => setNotifyOpen(false)} productId={product.id} productName={product.name} />
    </div>
  );
}
