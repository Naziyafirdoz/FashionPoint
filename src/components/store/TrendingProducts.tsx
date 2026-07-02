"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "@/types";
import { useProductReviewSummaries } from "@/hooks/useProductReviewSummaries";
import {
  getCarouselArrowVisibilityClassName,
  HOME_CAROUSEL_ARROW_CLASSNAME,
  useHomeHorizontalCarousel
} from "@/hooks/useHomeHorizontalCarousel";
import { OutOfStockModal } from "@/components/store/OutOfStockModal";
import { ProductCard } from "@/components/store/ProductCard";
import type { ProductReviewSummary } from "@/lib/reviews/types";
import { useState } from "react";

/** Matches Explore Our Collections visible card footprint (380px promo cards). */
const TRENDING_CAROUSEL_ITEM_WIDTH = 268;
const TRENDING_CAROUSEL_THRESHOLD = 4;

type Props = {
  products: Product[];
};

function TrendingProductCard({
  product,
  reviewSummary,
  onNotify
}: {
  product: Product;
  reviewSummary?: ProductReviewSummary | null;
  onNotify: () => void;
}) {
  return (
    <ProductCard
      product={product}
      reviewSummary={reviewSummary}
      variant="default"
      onNotify={onNotify}
    />
  );
}

function getGridClassName(count: number) {
  if (count === 1) {
    return "mx-auto mt-6 grid w-full max-w-[268px] grid-cols-1 justify-items-center gap-4";
  }
  if (count === 2) {
    return "mx-auto mt-6 grid w-full max-w-[560px] grid-cols-2 gap-4 sm:gap-4";
  }
  if (count === 3) {
    return "mx-auto mt-6 grid w-full max-w-[848px] grid-cols-2 gap-4 sm:gap-4 lg:max-w-[848px] lg:grid-cols-3";
  }
  return "mx-auto mt-6 grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4";
}

export function TrendingProducts({ products }: Props) {
  const [notifyProduct, setNotifyProduct] = useState<Product | null>(null);
  const carouselEnabled = products.length > TRENDING_CAROUSEL_THRESHOLD;

  const productIds = products.map((product) => product.id);
  const { summaries } = useProductReviewSummaries(productIds);

  const {
    scrollRef,
    canScrollPrev,
    canScrollNext,
    scrollByDirection,
    handleKeyDown,
    handlePointerDown,
    handlePointerMove,
    endDrag,
    trackClassName
  } = useHomeHorizontalCarousel({
    itemCount: products.length,
    itemWidth: TRENDING_CAROUSEL_ITEM_WIDTH,
    enabled: carouselEnabled
  });

  if (!products.length) {
    return <p className="mt-6 text-sm text-foreground/60">No products available.</p>;
  }

  if (!carouselEnabled) {
    return (
      <>
        <div className={getGridClassName(products.length)}>
          {products.map((product) => (
            <div key={product.id} className="w-full min-w-0 max-w-[268px] justify-self-center">
              <TrendingProductCard
                product={product}
                reviewSummary={summaries[product.id]}
                onNotify={() => setNotifyProduct(product)}
              />
            </div>
          ))}
        </div>

        <OutOfStockModal
          open={notifyProduct !== null}
          onClose={() => setNotifyProduct(null)}
          productId={notifyProduct?.id ?? ""}
          productName={notifyProduct?.name ?? ""}
        />
      </>
    );
  }

  return (
    <>
      <div className="relative mx-auto mt-6 w-full max-w-[1288px]">
        <button
          type="button"
          onClick={() => scrollByDirection(-1)}
          aria-label="Previous trending products"
          aria-hidden={!canScrollPrev}
          tabIndex={canScrollPrev ? 0 : -1}
          className={`${HOME_CAROUSEL_ARROW_CLASSNAME} left-0 sm:-left-1 ${getCarouselArrowVisibilityClassName(canScrollPrev)}`}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </button>

        <div
          ref={scrollRef}
          tabIndex={0}
          role="region"
          aria-roledescription="carousel"
          aria-label="Trending products"
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={trackClassName}
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="w-[min(calc(100vw-5rem),268px)] shrink-0 snap-start sm:w-[260px] lg:w-[268px]"
            >
              <TrendingProductCard
                product={product}
                reviewSummary={summaries[product.id]}
                onNotify={() => setNotifyProduct(product)}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollByDirection(1)}
          aria-label="Next trending products"
          aria-hidden={!canScrollNext}
          tabIndex={canScrollNext ? 0 : -1}
          className={`${HOME_CAROUSEL_ARROW_CLASSNAME} right-0 sm:-right-1 ${getCarouselArrowVisibilityClassName(canScrollNext)}`}
        >
          <ChevronRight className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      <OutOfStockModal
        open={notifyProduct !== null}
        onClose={() => setNotifyProduct(null)}
        productId={notifyProduct?.id ?? ""}
        productName={notifyProduct?.name ?? ""}
      />
    </>
  );
}
