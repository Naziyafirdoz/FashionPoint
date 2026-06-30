"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { ProductCard } from "@/components/store/ProductCard";
import { OutOfStockModal } from "@/components/store/OutOfStockModal";
import { useProductReviewSummaries } from "@/hooks/useProductReviewSummaries";
import type { Product } from "@/types";

const DIVIDER = "/assets/hero/explore-collections-divider.png";

const NAV_BTN =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#F3E5E8] bg-white text-primary shadow-[0_4px_16px_rgba(123,13,43,0.12)] transition-all duration-200 hover:scale-105 hover:border-primary/20 hover:shadow-[0_6px_20px_rgba(123,13,43,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:h-11 sm:w-11";

type ProductDetailRecommendationsProps = {
  products: Product[];
};

export function ProductDetailRecommendations({ products }: ProductDetailRecommendationsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const productIds = products.map((product) => product.id);
  const { summaries } = useProductReviewSummaries(productIds);
  const [notifyProduct, setNotifyProduct] = useState<Product | null>(null);

  if (products.length === 0) return null;

  const showCarouselNav = products.length > 2;
  const centerCards = products.length <= 2;

  const scroll = (direction: "left" | "right") => {
    const node = scrollRef.current;
    if (!node) return;
    const amount = node.clientWidth * 0.85;
    node.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!showCarouselNav) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      scroll("left");
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      scroll("right");
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="mt-14 sm:mt-16"
      aria-labelledby="pdp-recommendations-heading"
    >
      <header className="mb-8 text-center sm:mb-10">
        <h2
          id="pdp-recommendations-heading"
          className="font-display text-[2rem] font-bold leading-tight tracking-tight text-primary sm:text-[2.25rem] md:text-[2.5rem]"
        >
          You May Also Like
        </h2>
        <Image
          src={DIVIDER}
          alt=""
          width={267}
          height={40}
          aria-hidden
          sizes="267px"
          className="mx-auto mt-4 block h-auto w-auto max-w-[min(100%,267px)]"
        />
      </header>

      <div className="mx-auto w-full max-w-[1480px]">
        <div className="flex items-center gap-2 sm:gap-4">
          {showCarouselNav ? (
            <button
              type="button"
              onClick={() => scroll("left")}
              className={NAV_BTN}
              aria-label="Scroll recommendations left"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </button>
          ) : null}

          <div
            ref={scrollRef}
            tabIndex={showCarouselNav ? 0 : undefined}
            role="region"
            aria-roledescription="carousel"
            aria-label="Recommended products"
            onKeyDown={handleKeyDown}
            className={`min-w-0 flex-1 snap-x snap-mandatory overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
              centerCards ? "flex justify-center" : "flex"
            } gap-4 sm:gap-5 lg:gap-6`}
          >
            {products.map((product) => (
              <div
                key={product.id}
                className="w-[min(100%,220px)] shrink-0 snap-start sm:w-[236px] md:w-[252px] lg:w-[268px]"
              >
                <ProductCard
                  product={product}
                  reviewSummary={summaries[product.id]}
                  variant="recommendation"
                  onNotify={() => setNotifyProduct(product)}
                />
              </div>
            ))}
          </div>

          {showCarouselNav ? (
            <button
              type="button"
              onClick={() => scroll("right")}
              className={NAV_BTN}
              aria-label="Scroll recommendations right"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      <OutOfStockModal
        open={notifyProduct !== null}
        onClose={() => setNotifyProduct(null)}
        productId={notifyProduct?.id ?? ""}
        productName={notifyProduct?.name ?? ""}
      />
    </motion.section>
  );
}
