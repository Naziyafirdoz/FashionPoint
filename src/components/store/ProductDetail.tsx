"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Ruler, ShoppingBag } from "lucide-react";
import toast from "react-hot-toast";
import type { Product } from "@/types";
import { useCartStore } from "@/stores/cart";
import { useCheckoutSession } from "@/stores/checkout-session";
import { OutOfStockModal } from "./OutOfStockModal";
import { ProductDetailGallery } from "@/components/store/product-detail/ProductDetailGallery";
import { ProductDetailRecommendations } from "@/components/store/product-detail/ProductDetailRecommendations";
import { ProductDetailTabs } from "@/components/store/product-detail/ProductDetailTabs";
import { ProductColorSwatch } from "@/components/store/ProductColorSwatch";
import { ReviewStars } from "@/components/reviews/ReviewStars";
import type { ProductReviewSummary } from "@/lib/reviews/types";
import {
  discountPercent,
  isSizeUnavailableForColor,
  resolveVariantDisplay
} from "@/lib/products/variants";

const SIZES = ["XS(32)", "S(34)", "M(36)", "L(38)", "XL(40)", "XXL(42)"];

const SECTION_HEADING =
  "text-xs font-semibold uppercase tracking-[0.1em] text-primary";

const SECTION_VALUE =
  "text-sm font-medium normal-case tracking-normal text-[#2A2A2A]";

const ATTR_LABEL =
  "text-[11px] font-medium uppercase tracking-[0.08em] text-[#9A7A82]";

const ATTR_VALUE =
  "mt-0.5 text-[15px] font-medium leading-snug text-[#2A2A2A]";

const PURCHASE_SECTION = "mt-5";

const PDP_BTN =
  "text-[15px] font-semibold tracking-[0.02em] transition-all duration-200 ease-out active:scale-[0.98]";

const BUY_NOW_BTN =
  "inline-flex flex h-[52px] w-full flex-1 items-center justify-center gap-2 rounded-full border-2 border-primary bg-white text-primary transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary hover:bg-[#FFF5F7] hover:text-primary hover:shadow-[0_6px_20px_rgba(123,13,43,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] active:border-primary active:bg-[#FFF0F4] active:text-primary disabled:cursor-not-allowed disabled:border-[#E0E0E0] disabled:bg-[#F3F3F3] disabled:text-[#8A8A8A] disabled:hover:translate-y-0 disabled:hover:shadow-none";

type AttributeField = {
  label: string;
  value?: string | null;
};

function buildAttributeFields(product: Product): AttributeField[] {
  return [
    { label: "FABRIC", value: product.fabric },
    { label: "NECK TYPE", value: product.neck_type },
    { label: "SLEEVE TYPE", value: product.sleeve_type },
    { label: "CLOSURE", value: product.closure_type }
  ].filter((field) => field.value);
}

function ShortDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 180;
  const displayText = !isLong || expanded ? text : `${text.slice(0, 180).trim()}…`;

  if (!text) return null;

  return (
    <div className="mt-5 max-w-prose">
      <p className="text-base leading-[1.75] text-[#4A4A4A] md:text-[17px] md:leading-[1.8]">
        {displayText}
      </p>
      {isLong ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-2 text-sm font-semibold text-primary transition hover:text-primary/80"
        >
          {expanded ? "Read less" : "Read more"}
        </button>
      ) : null}
    </div>
  );
}

export function ProductDetail({
  product,
  recommendedProducts = []
}: {
  product: Product;
  recommendedProducts?: Product[];
}) {
  const sizeOptions = product.sizes?.length ? product.sizes : SIZES;
  const colorSwatches =
    product.color_swatches ??
    (product.colors ?? []).map((name) => ({
      name,
      hex: null
    }));
  const defaultColor = colorSwatches[0]?.name ?? product.colors?.[0] ?? "Pink";
  const defaultSize =
    sizeOptions.find((s) => !isSizeUnavailableForColor(product, s, defaultColor)) ??
    sizeOptions[0] ??
    SIZES[2];

  const [size, setSize] = useState(defaultSize);
  const [color, setColor] = useState(defaultColor);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [buyNowLoading, setBuyNowLoading] = useState(false);
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
  const attributeFields = buildAttributeFields(product);
  const categoryHref = product.category?.slug
    ? `/category/${product.category.slug}`
    : "/designer-wear";
  const categoryName = product.category?.name ?? "Category";

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
    if (buyNowLoading) return;
    if (outOfStock) {
      toast.error("This variant is out of stock");
      return;
    }
    setBuyNowLoading(true);
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

  return (
    <div className="bg-[#FFFBF9] pb-16">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8">
        <nav className="mb-8 text-sm text-[#888888]" aria-label="Breadcrumb">
          <Link href="/" className="transition hover:text-primary">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href={categoryHref} className="transition hover:text-primary">
            {categoryName}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[#4A4A4A]">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[48%_52%] lg:gap-12 xl:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <ProductDetailGallery product={product} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.05 }}
            className="min-w-0"
          >
            {product.is_bestseller ? (
              <span className="inline-flex rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                BESTSELLER
              </span>
            ) : null}

            <h1 className="mt-3 max-w-2xl font-display text-[1.875rem] font-bold leading-[1.25] tracking-tight text-primary sm:text-[2.125rem] md:text-[2.5rem]">
              {product.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              {reviewSummary.review_count > 0 ? (
                <>
                  <ReviewStars rating={reviewSummary.average_rating} size="lg" showValue />
                  <span className="text-sm text-[#888888]">
                    ({reviewSummary.review_count} Review{reviewSummary.review_count === 1 ? "" : "s"})
                  </span>
                </>
              ) : (
                <span className="text-sm text-[#888888]">No reviews yet</span>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
              <span className="text-[2rem] font-bold leading-none tracking-tight text-primary md:text-[2.25rem]">
                ₹{selection.price.toLocaleString("en-IN")}
              </span>
              {selection.compare_price && selection.compare_price > selection.price ? (
                <>
                  <span className="text-base text-[#9A9A9A] line-through">
                    ₹{selection.compare_price.toLocaleString("en-IN")}
                  </span>
                  <span className="rounded-full bg-[#FFF0F4] px-3 py-1 text-sm font-medium text-primary">
                    {discount}% OFF
                  </span>
                </>
              ) : null}
            </div>

            <p className="mt-3 text-[15px] leading-snug">
              {outOfStock ? (
                <span className="font-medium text-red-600">Out of stock</span>
              ) : selection.stock_quantity <= 5 ? (
                <span className="font-medium text-amber-700">
                  Only {selection.stock_quantity} left in stock
                </span>
              ) : (
                <span className="font-medium text-green-700">In stock</span>
              )}
              {selection.sku ? (
                <span className="text-xs text-[#999999]"> · SKU: {selection.sku}</span>
              ) : null}
            </p>

            {product.short_description ? (
              <ShortDescription text={product.short_description} />
            ) : null}

            {colorSwatches.length > 0 ? (
              <div className={PURCHASE_SECTION}>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <p className={SECTION_HEADING}>Color</p>
                  <span className={SECTION_VALUE}>{color}</span>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                  {colorSwatches.map((swatch) => (
                    <ProductColorSwatch
                      key={swatch.name}
                      name={swatch.name}
                      hex={swatch.hex}
                      selected={color === swatch.name}
                      onClick={() => setColor(swatch.name)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div className={PURCHASE_SECTION}>
              <div className="flex items-center justify-between gap-3">
                <p className={SECTION_HEADING}>Size</p>
                <Link
                  href="/size-guide"
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary underline-offset-2 transition hover:underline"
                >
                  <Ruler className="h-3.5 w-3.5" aria-hidden="true" />
                  Size Guide
                </Link>
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
                      className={`min-w-[2.75rem] rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                        disabled
                          ? "cursor-not-allowed border border-[#E8D4DA] bg-[#F8F8F8] text-[#AAAAAA] line-through"
                          : size === s
                            ? "bg-primary font-semibold text-white shadow-[0_4px_14px_rgba(123,13,43,0.25)]"
                            : "border border-[#E8D4DA] bg-white text-[#2A2A2A] hover:border-primary/50 hover:shadow-sm"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {attributeFields.length > 0 ? (
              <dl
                className={`${PURCHASE_SECTION} grid grid-cols-1 gap-x-8 gap-y-3.5 rounded-[15px] border border-[#EDE0E4] bg-[#FFFBFC] px-4 py-3.5 shadow-[0_2px_12px_rgba(122,13,43,0.05)] sm:grid-cols-2`}
              >
                {attributeFields.map((field) => (
                  <div key={field.label}>
                    <dt className={ATTR_LABEL}>{field.label}</dt>
                    <dd className={ATTR_VALUE}>{field.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {outOfStock ? (
              <div className="mt-6">
                <button
                  type="button"
                  disabled
                  className="w-full rounded-full bg-foreground/30 py-3.5 text-[15px] font-semibold tracking-[0.02em] text-white"
                >
                  OUT OF STOCK
                </button>
                <p className="mt-2.5 text-sm leading-relaxed text-[#666666]">
                  Out of stock? We&apos;ll email you as soon as it&apos;s back in stock.
                </p>
                <button
                  type="button"
                  onClick={() => setNotifyOpen(true)}
                  className={`btn-primary mt-3 w-full ${PDP_BTN}`}
                >
                  Notify Me
                </button>
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-4 sm:flex-row">
                <button
                  type="button"
                  onClick={handleAdd}
                  className={`btn-primary flex h-[52px] w-full flex-1 items-center justify-center gap-2 rounded-full shadow-[0_5px_18px_rgba(123,13,43,0.22)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(123,13,43,0.3)] ${PDP_BTN}`}
                >
                  <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                  ADD TO CART
                </button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  aria-busy={buyNowLoading}
                  className={`${BUY_NOW_BTN} ${PDP_BTN} ${buyNowLoading ? "pointer-events-none cursor-wait bg-[#FFF5F7] text-primary" : ""}`}
                >
                  {buyNowLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                      Redirecting...
                    </>
                  ) : (
                    "BUY NOW"
                  )}
                </button>
              </div>
            )}

          </motion.div>
        </div>

        <ProductDetailTabs
          product={product}
          sku={selection.sku ?? product.sku}
          reviewSummary={reviewSummary}
          onSummaryChange={setReviewSummary}
        />

        <ProductDetailRecommendations products={recommendedProducts} />
      </div>

      <OutOfStockModal
        open={notifyOpen}
        onClose={() => setNotifyOpen(false)}
        productId={product.id}
        productName={product.name}
        source="detail"
      />
    </div>
  );
}
