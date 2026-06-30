"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { Eye, Heart } from "lucide-react";
import toast from "react-hot-toast";
import { ProductCardRating } from "@/components/reviews/ProductCardRating";
import { ProductImage } from "./ProductImage";
import { useWishlistStore } from "@/stores/wishlist";
import { fitProductCardTitle } from "@/lib/products/fit-product-card-title";
import type { ProductReviewSummary } from "@/lib/reviews/types";
import type { Product } from "@/types";

const PREMIUM_CARD =
  "group relative flex w-full flex-col overflow-hidden rounded-[16px] border border-[#F3E5E8] bg-white shadow-[0_3px_14px_rgba(122,13,43,0.04)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[#7B0D2B]/10 hover:shadow-[0_8px_24px_rgba(122,13,43,0.07)]";

const WISHLIST_CARD =
  "group relative flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-[#F3E5E8] bg-white shadow-[0_3px_14px_rgba(122,13,43,0.04)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[#7B0D2B]/10 hover:shadow-[0_8px_24px_rgba(122,13,43,0.07)]";

const BADGE_BASE =
  "inline-flex h-[18px] items-center rounded-full px-2 text-[9px] font-bold uppercase tracking-wide text-white";

const WISHLIST_BTN =
  "absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-[#F3E5E8] bg-white/95 shadow-[0_2px_8px_rgba(122,13,43,0.06)] transition-all duration-300 hover:scale-105 hover:border-[#7B0D2B]/20 hover:bg-[#FFF5F7]";

const RECOMMENDATION_CARD =
  "group relative flex w-full flex-col overflow-hidden rounded-[14px] border border-[#F3E5E8] bg-white shadow-[0_2px_10px_rgba(122,13,43,0.035)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[#7B0D2B]/10 hover:shadow-[0_6px_18px_rgba(122,13,43,0.06)]";

const VIEW_PRODUCT_BTN =
  "inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-full border border-[#7B0D2B]/50 bg-white px-5 text-xs font-semibold text-[#7B0D2B] transition-all duration-300 ease-out hover:border-[#7B0D2B] hover:bg-[#7B0D2B] hover:text-white hover:shadow-[0_3px_10px_rgba(122,13,43,0.1)]";

const VIEW_PRODUCT_BTN_COMPACT =
  "inline-flex h-9 w-full items-center justify-center gap-1 rounded-full border border-[#7B0D2B]/50 bg-white px-4 text-[11px] font-semibold text-[#7B0D2B] transition-all duration-300 ease-out hover:border-[#7B0D2B] hover:bg-[#7B0D2B] hover:text-white hover:shadow-[0_3px_10px_rgba(122,13,43,0.1)]";

const WISHLIST_BTN_COMPACT =
  "absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[#F3E5E8] bg-white/95 shadow-[0_2px_6px_rgba(122,13,43,0.05)] transition-all duration-300 hover:scale-105 hover:border-[#7B0D2B]/20 hover:bg-[#FFF5F7]";

const IMAGE_LINK_BASE =
  "relative block w-full overflow-hidden rounded-[10px] bg-white";

/** Image fills the frame edge-to-edge; badges float above */
const IMAGE_FRAME = "absolute inset-0 overflow-hidden";

/** ~12% visual boost within object-contain without cropping */
const IMAGE_SCALE =
  "h-full w-full origin-center scale-[1.08] transition-transform duration-300 ease-out group-hover:scale-[1.11]";

type Props = {
  product: Product;
  onNotify?: () => void;
  reviewSummary?: ProductReviewSummary | null;
  variant?: "default" | "collection" | "listing" | "wishlist" | "recommendation";
  listView?: boolean;
  /** Renders beside View Product on wishlist cards (e.g. Move to Bag). */
  actionSlot?: ReactNode;
  footerSlot?: ReactNode;
};

function isProductOutOfStock(product: Product): boolean {
  if (product.variants && product.variants.length > 0) {
    return product.variants.every((v) => v.stock_quantity <= 0);
  }
  return product.stock_quantity !== undefined && product.stock_quantity <= 0;
}

function getDiscountPercent(product: Product): number | null {
  if (product.compare_price && product.compare_price > product.price) {
    return Math.round((1 - product.price / product.compare_price) * 100);
  }
  return null;
}

function ProductBadges({
  product,
  outOfStock
}: {
  product: Product;
  outOfStock: boolean;
}) {
  return (
    <div className="absolute left-1.5 top-1.5 z-10 flex flex-col gap-0.5">
      {outOfStock ? <span className={`${BADGE_BASE} bg-[#777777]`}>Out of Stock</span> : null}
      {product.is_new && !outOfStock ? (
        <span className={`${BADGE_BASE} bg-[#7B0D2B]`}>New</span>
      ) : null}
      {product.is_bestseller && !outOfStock ? (
        <span className={`${BADGE_BASE} bg-[#B8860B]`}>Bestseller</span>
      ) : null}
    </div>
  );
}

function WishlistButton({
  wished,
  onClick,
  label,
  compact = false
}: {
  wished: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  label: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={compact ? WISHLIST_BTN_COMPACT : WISHLIST_BTN}
      aria-label={label}
    >
      <Heart
        className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"} text-[#7B0D2B] transition-colors duration-300 ${wished ? "fill-[#7B0D2B]" : "fill-none"}`}
        strokeWidth={1.75}
      />
    </button>
  );
}

function PriceSection({
  product,
  discountPercent,
  wishlist = false,
  compact = false
}: {
  product: Product;
  discountPercent: number | null;
  wishlist?: boolean;
  compact?: boolean;
}) {
  const rowClass = compact
    ? "flex flex-wrap items-baseline gap-x-2 gap-y-1 pl-2"
    : "flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5 pl-2";

  return (
    <div className={rowClass}>
      <span
        className={`shrink-0 font-bold leading-none tracking-tight text-[#7B0D2B] ${
          wishlist ? "text-[1.35rem]" : compact ? "text-lg" : "text-xl"
        }`}
      >
        ₹{product.price.toLocaleString("en-IN")}
      </span>
      {product.compare_price ? (
        <span
          className={`shrink-0 text-[#9A9A9A] line-through ${
            compact ? "text-[11px]" : wishlist ? "text-[13px]" : "text-xs"
          }`}
        >
          ₹{product.compare_price.toLocaleString("en-IN")}
        </span>
      ) : null}
      {discountPercent ? (
        <span
          className={`inline-flex shrink-0 items-center rounded-full bg-[#E8F5EE] font-bold uppercase tracking-wide text-[#2E7D57] ${
            compact
              ? "px-1.5 py-px text-[8px]"
              : wishlist
                ? "px-2 py-0.5 text-[10px]"
                : "px-1.5 py-px text-[9px]"
          }`}
        >
          {discountPercent}% off
        </span>
      ) : null}
    </div>
  );
}

function ViewProductButton({
  slug,
  className = "",
  compact = false
}: {
  slug: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={`/product/${slug}`}
      className={`${compact ? VIEW_PRODUCT_BTN_COMPACT : VIEW_PRODUCT_BTN} ${className}`}
    >
      <Eye
        className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"} shrink-0 stroke-[2]`}
        aria-hidden="true"
      />
      <span>View Product</span>
    </Link>
  );
}

/** Two lines — fixed height for uniform card alignment */
const TITLE_HEIGHT = "h-[2.625rem]";
const TITLE_CLASS = `line-clamp-2 ${TITLE_HEIGHT} w-full max-w-none break-normal whitespace-normal hyphens-none overflow-hidden pl-2 text-[14px] font-semibold leading-[1.5] text-[#2A2A2A] transition-colors duration-200 hover:text-[#7B0D2B]`;
const TITLE_MEASURE_CLASS =
  "pointer-events-none invisible absolute left-0 top-0 z-[-1] w-full max-w-none break-normal whitespace-normal hyphens-none pl-2 text-[14px] font-semibold leading-[1.5] opacity-0";

const TITLE_HEIGHT_COMPACT = "h-[2.375rem]";
const TITLE_CLASS_COMPACT = `line-clamp-2 ${TITLE_HEIGHT_COMPACT} w-full max-w-none break-normal whitespace-normal hyphens-none overflow-hidden pl-2 text-[13px] font-semibold leading-[1.45] text-[#2A2A2A] transition-colors duration-200 hover:text-[#7B0D2B]`;
const TITLE_MEASURE_CLASS_COMPACT =
  "pointer-events-none invisible absolute left-0 top-0 z-[-1] w-full max-w-none break-normal whitespace-normal hyphens-none pl-2 text-[13px] font-semibold leading-[1.45] opacity-0";

function ProductTitle({ name, slug, compact = false }: { name: string; slug: string; compact?: boolean }) {
  const areaRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLParagraphElement>(null);
  const [displayName, setDisplayName] = useState(name);
  const heightClass = compact ? TITLE_HEIGHT_COMPACT : TITLE_HEIGHT;
  const titleClass = compact ? TITLE_CLASS_COMPACT : TITLE_CLASS;
  const measureClass = compact ? TITLE_MEASURE_CLASS_COMPACT : TITLE_MEASURE_CLASS;

  useLayoutEffect(() => {
    const area = areaRef.current;
    const measure = measureRef.current;
    if (!area || !measure) return;

    const update = () => {
      const width = area.clientWidth;
      if (width <= 0) return;

      measure.style.width = `${width}px`;

      const lineHeight = parseFloat(getComputedStyle(measure).lineHeight);
      const maxHeight = lineHeight * 2;

      const fits = (text: string) => {
        measure.textContent = text;
        return measure.scrollHeight <= maxHeight + 1;
      };

      setDisplayName(fitProductCardTitle(name, fits));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(area);
    return () => observer.disconnect();
  }, [name, compact]);

  return (
    <div ref={areaRef} className={`relative w-full max-w-none self-stretch ${heightClass}`}>
      <p ref={measureRef} className={measureClass} aria-hidden="true" />
      <Link
        href={`/product/${slug}`}
        className={`block w-full max-w-none min-w-0 ${heightClass}`}
        title={name}
      >
        <h3 className={titleClass}>{displayName}</h3>
      </Link>
    </div>
  );
}

function ProductImageArea({ product, sizes }: { product: Product; sizes: string }) {
  if (!product.images?.[0]) {
    return (
      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-[#999999]">
        No image available
      </span>
    );
  }

  return (
    <div className={IMAGE_FRAME}>
      <div className={`relative ${IMAGE_SCALE}`}>
        <ProductImage
          src={product.images[0]}
          alt={product.name}
          className="object-contain object-center"
          sizes={sizes}
        />
      </div>
    </div>
  );
}

export function ProductCard({
  product,
  onNotify,
  reviewSummary,
  variant = "default",
  listView = false,
  actionSlot,
  footerSlot
}: Props) {
  const outOfStock = isProductOutOfStock(product);
  const isRecommendation = variant === "recommendation";
  const isWishlist = variant === "wishlist";
  const isCollection = variant === "collection" || variant === "listing" || isWishlist;
  const isListing = variant === "listing" || isWishlist;
  const wished = useWishlistStore((state) => state.has(product.id));
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const discountPercent = getDiscountPercent(product);

  const handleWishlistClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    toggleWishlist(product.id);
    toast.success(wished ? "Removed from wishlist" : "Added to wishlist");
  };

  const wishlistLabel = wished ? "Remove from wishlist" : "Add to wishlist";
  const notifyButtonClass = `${VIEW_PRODUCT_BTN} disabled:cursor-not-allowed disabled:opacity-50`;
  const notifyButtonCompactClass = `${VIEW_PRODUCT_BTN_COMPACT} disabled:cursor-not-allowed disabled:opacity-50`;

  const listingImageSizes = "(max-width: 640px) 50vw, (max-width: 1024px) 40vw, 24vw";
  const collectionImageSizes =
    "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 280px";
  const recommendationImageSizes =
    "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 22vw";

  const imageAspectClass = listView
    ? isWishlist
      ? "aspect-[13/10] w-[clamp(8rem,38%,12rem)] shrink-0"
      : "aspect-[50/49] w-[clamp(8rem,38%,12rem)] shrink-0"
    : isWishlist
      ? "aspect-[13/10] w-full"
      : "aspect-[50/49] w-full";

  const cardShell = isWishlist ? WISHLIST_CARD : PREMIUM_CARD;
  const cardPadding = isWishlist
    ? listView
      ? "flex flex-row gap-2.5 px-2 py-2.5"
      : "px-2 py-2.5"
    : listView
      ? "flex flex-row gap-3 px-1.5 py-3.5"
      : "px-1.5 py-3.5";

  const contentGap = isWishlist ? "gap-2" : "gap-2.5";
  const imageToContentMt = isWishlist ? "mt-2" : "mt-2.5";

  const wishlistActionRow = isWishlist && actionSlot;

  const primaryAction = outOfStock ? (
    <button
      type="button"
      onClick={onNotify}
      disabled={!onNotify}
      className={`${notifyButtonClass} w-full`}
    >
      Notify Me
    </button>
  ) : (
    <ViewProductButton slug={product.slug} className="w-full" />
  );

  const detailsSection = (
    <div className={`flex w-full min-w-0 flex-1 flex-col ${contentGap}`}>
      <ProductTitle name={product.name} slug={product.slug} />
      <PriceSection product={product} discountPercent={discountPercent} wishlist={isWishlist} />
      <ProductCardRating summary={reviewSummary} listing />
      <div
        className={`flex flex-col ${wishlistActionRow ? "gap-1.5" : contentGap} ${wishlistActionRow || footerSlot ? "mt-auto" : ""}`}
      >
        {wishlistActionRow ? (
          <div className="grid w-full grid-cols-2 gap-3">
            {primaryAction}
            <div className="min-w-0">{actionSlot}</div>
          </div>
        ) : (
          primaryAction
        )}
        {footerSlot ? <div className="flex justify-center">{footerSlot}</div> : null}
      </div>
    </div>
  );

  if (isRecommendation) {
    const recommendationDetails = (
      <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5">
        <ProductTitle name={product.name} slug={product.slug} compact />
        <PriceSection product={product} discountPercent={discountPercent} compact />
        <ProductCardRating summary={reviewSummary} listing />
        <div className="flex flex-col gap-1.5">
          {outOfStock ? (
            <button
              type="button"
              onClick={onNotify}
              disabled={!onNotify}
              className={notifyButtonCompactClass}
            >
              Notify Me
            </button>
          ) : (
            <ViewProductButton slug={product.slug} compact />
          )}
        </div>
      </div>
    );

    return (
      <article className={`${RECOMMENDATION_CARD} min-w-0 px-1.5 py-2`}>
        <Link
          href={`/product/${product.slug}`}
          className={`${IMAGE_LINK_BASE} aspect-[11/9] w-full`}
        >
          <ProductImageArea product={product} sizes={recommendationImageSizes} />
          <WishlistButton
            wished={wished}
            onClick={handleWishlistClick}
            label={wishlistLabel}
            compact
          />
          <ProductBadges product={product} outOfStock={outOfStock} />
        </Link>
        <div className="mt-1.5 flex w-full min-w-0 flex-col">{recommendationDetails}</div>
      </article>
    );
  }

  if (isListing) {
    return (
      <article className={`${cardShell} min-w-0 ${cardPadding}`}>
        <Link href={`/product/${product.slug}`} className={`${IMAGE_LINK_BASE} ${imageAspectClass}`}>
          <ProductImageArea product={product} sizes={listingImageSizes} />
          <WishlistButton wished={wished} onClick={handleWishlistClick} label={wishlistLabel} />
          <ProductBadges product={product} outOfStock={outOfStock} />
        </Link>
        <div
          className={`flex min-w-0 flex-col ${listView ? "flex-1 justify-center" : `${imageToContentMt} flex-1`}`}
        >
          {detailsSection}
        </div>
      </article>
    );
  }

  return (
    <article className={`${cardShell} min-w-0 ${listView ? `flex gap-3 ${cardPadding}` : cardPadding}`}>
      <Link
        href={`/product/${product.slug}`}
        className={`${IMAGE_LINK_BASE} ${imageAspectClass}`}
      >
        <ProductImageArea
          product={product}
          sizes={isCollection ? collectionImageSizes : "(max-width: 640px) 50vw, 25vw"}
        />
        <WishlistButton wished={wished} onClick={handleWishlistClick} label={wishlistLabel} />
        <ProductBadges product={product} outOfStock={outOfStock} />
      </Link>
      <div
        className={`flex w-full min-w-0 flex-col ${listView ? "flex-1 justify-center" : imageToContentMt}`}
      >
        {detailsSection}
      </div>
    </article>
  );
}
