"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, X, ZoomIn } from "lucide-react";
import toast from "react-hot-toast";
import { ProductImage } from "@/components/store/ProductImage";
import { useWishlistStore } from "@/stores/wishlist";
import type { Product } from "@/types";

const THUMB_CLASS =
  "relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl border bg-white transition-all duration-300 md:h-[76px] md:w-[76px] lg:h-20 lg:w-20";

const THUMB_INACTIVE =
  "border-[#E8E0E4] hover:scale-[1.04] hover:border-primary/35 hover:shadow-[0_4px_14px_rgba(122,13,43,0.1)]";

const THUMB_ACTIVE =
  "scale-[1.02] border-2 border-primary shadow-[0_4px_16px_rgba(122,13,43,0.14)]";

type ProductDetailGalleryProps = {
  product: Product;
};

function ThumbnailButton({
  src,
  index,
  active,
  onSelect
}: {
  src: string;
  index: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`${THUMB_CLASS} ${active ? THUMB_ACTIVE : THUMB_INACTIVE}`}
      aria-label={`View product image ${index + 1}`}
      aria-current={active}
    >
      <ProductImage
        src={src}
        alt=""
        sizes="80px"
        className="object-cover object-center"
      />
    </button>
  );
}

export function ProductDetailGallery({ product }: ProductDetailGalleryProps) {
  const images = (product.images ?? []).filter(Boolean);
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);

  const wished = useWishlistStore((state) => state.has(product.id));
  const toggleWishlist = useWishlistStore((state) => state.toggle);

  useEffect(() => {
    if (activeIndex >= images.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, images.length]);

  const activeImage = images[activeIndex] ?? images[0];

  const handleWishlist = () => {
    toggleWishlist(product.id);
    toast.success(wished ? "Removed from wishlist" : "Added to wishlist");
  };

  return (
    <div className="w-full">
      <div className="flex gap-3 md:gap-[12px]">
        {images.length > 0 ? (
          <div
            className="hidden max-h-[calc(5rem*6+0.75rem*5)] shrink-0 flex-col gap-3 overflow-y-auto overscroll-contain pr-0.5 [-ms-overflow-style:none] [scrollbar-width:thin] sm:flex [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#E8D4DA]"
            aria-label="Product image thumbnails"
          >
            {images.map((img, index) => (
              <ThumbnailButton
                key={`${img}-${index}`}
                src={img}
                index={index}
                active={index === activeIndex}
                onSelect={() => setActiveIndex(index)}
              />
            ))}
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="relative mx-auto aspect-square w-full max-w-[600px] overflow-hidden rounded-2xl border border-[#EDE4E8] bg-[#FAF7F8] shadow-[0_8px_28px_rgba(122,13,43,0.08)]">
            {activeImage ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="absolute inset-0"
                >
                  <ProductImage
                    src={activeImage}
                    alt={product.name}
                    priority
                    sizes="(max-width: 768px) 100vw, 600px"
                    className="object-contain object-center"
                  />
                </motion.div>
              </AnimatePresence>
            ) : null}

            <div className="absolute right-3 top-3 z-10 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleWishlist}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#F3E5E8] bg-white shadow-[0_4px_16px_rgba(122,13,43,0.12)] transition-all duration-300 hover:scale-105 hover:border-primary/25 hover:shadow-[0_6px_20px_rgba(122,13,43,0.16)]"
                aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart
                  className={`h-[18px] w-[18px] text-primary transition-colors ${wished ? "fill-primary" : "fill-none"}`}
                  strokeWidth={1.75}
                />
              </button>
              {activeImage ? (
                <button
                  type="button"
                  onClick={() => setZoomOpen(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#F3E5E8] bg-white shadow-[0_4px_16px_rgba(122,13,43,0.12)] transition-all duration-300 hover:scale-105 hover:border-primary/25 hover:shadow-[0_6px_20px_rgba(122,13,43,0.16)]"
                  aria-label="Zoom product image"
                >
                  <ZoomIn className="h-[18px] w-[18px] text-primary" strokeWidth={1.75} />
                </button>
              ) : null}
            </div>
          </div>

          {images.length > 1 ? (
            <div
              className="mt-3 flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden"
              aria-label="Product image thumbnails"
            >
              {images.map((img, index) => (
                <ThumbnailButton
                  key={`mobile-${img}-${index}`}
                  src={img}
                  index={index}
                  active={index === activeIndex}
                  onSelect={() => setActiveIndex(index)}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {zoomOpen && activeImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Zoomed product image"
          onClick={() => setZoomOpen(false)}
        >
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary shadow-lg"
            aria-label="Close zoom"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="relative aspect-square w-full max-w-3xl overflow-hidden rounded-2xl bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            <ProductImage
              src={activeImage}
              alt={product.name}
              sizes="100vw"
              className="object-contain object-center"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
