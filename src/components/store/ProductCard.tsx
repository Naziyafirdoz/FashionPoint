"use client";

import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import toast from "react-hot-toast";
import { ProductCardRating } from "@/components/reviews/ProductCardRating";
import { ProductImage } from "./ProductImage";
import { useCartStore } from "@/stores/cart";
import type { ProductReviewSummary } from "@/lib/reviews/types";
import type { Product } from "@/types";

const DEFAULT_SIZES = ["XS(32)", "S(34)", "M(36)", "L(38)", "XL(40)", "XXL(42)"];

type Props = {
  product: Product;
  onNotify?: () => void;
  reviewSummary?: ProductReviewSummary | null;
  variant?: "default" | "collection";
  listView?: boolean;
};

function isProductOutOfStock(product: Product): boolean {
  if (product.variants && product.variants.length > 0) {
    return product.variants.every((v) => v.stock_quantity <= 0);
  }
  return product.stock_quantity !== undefined && product.stock_quantity <= 0;
}

export function ProductCard({
  product,
  onNotify,
  reviewSummary,
  variant = "default",
  listView = false
}: Props) {
  const outOfStock = isProductOutOfStock(product);
  const isCollection = variant === "collection";
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = () => {
    if (outOfStock) {
      toast.error("This product is out of stock");
      return;
    }

    const size = product.sizes?.[0] ?? DEFAULT_SIZES[2];
    const color = product.colors?.[0] ?? "Pink";

    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      size,
      color,
      quantity: 1,
      image: product.images?.[0] ?? "",
      slug: product.slug
    });
    toast.success("Added to cart");
  };

  const imageBlock = (
    <div
      className={
        isCollection
          ? `relative overflow-hidden rounded-2xl bg-[#FFF9FA] ${
              listView ? "aspect-[4/5] w-40 shrink-0 sm:w-48" : "aspect-[3/4] w-full"
            }`
          : "relative aspect-[3/4] overflow-hidden rounded-xl bg-blush"
      }
    >
        {product.images?.[0] && (
          <ProductImage
            src={product.images[0]}
            alt={product.name}
            className="object-cover object-center transition duration-300 group-hover:scale-[1.03]"
            sizes={
              isCollection
                ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 280px"
                : "(max-width: 640px) 50vw, 25vw"
            }
          />
        )}
        <button type="button" className="absolute right-2 top-2 rounded-full bg-white/90 p-2 shadow" aria-label="Wishlist">
          <Heart className="h-4 w-4 text-primary" />
        </button>
        {product.is_new && (
          <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
            NEW
          </span>
        )}
        {product.is_bestseller && (
          <span className={`absolute left-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white ${product.is_new ? "top-8" : "top-2"}`}>
            BESTSELLER
          </span>
        )}
        {outOfStock && (
          <span className="absolute inset-x-2 bottom-2 rounded bg-foreground/70 py-1 text-center text-xs font-bold text-white">
            OUT OF STOCK
          </span>
        )}
      </div>
  );

  const detailsBlock = (
    <>
      <h3
        className={`font-medium text-foreground line-clamp-2 ${
          isCollection ? "mt-0 text-[15px] leading-snug" : "mt-3"
        }`}
      >
        {product.name}
      </h3>
      <div className={`flex items-center gap-2 ${isCollection ? "mt-3" : "mt-1"}`}>
        <span className={`font-bold text-primary ${isCollection ? "text-base" : ""}`}>
          ₹{product.price.toLocaleString("en-IN")}
        </span>
        {product.compare_price && (
          <span className="text-sm text-foreground/50 line-through">
            ₹{product.compare_price.toLocaleString("en-IN")}
          </span>
        )}
      </div>
      <div className={isCollection ? "mt-3" : undefined}>
        <ProductCardRating summary={reviewSummary} />
      </div>
      {outOfStock ? (
        <button
          type="button"
          onClick={onNotify}
          className={`btn-outline w-full text-xs ${isCollection ? "mt-4 py-2.5" : "mt-3"}`}
        >
          Notify Me
        </button>
      ) : isCollection ? (
        <button
          type="button"
          onClick={handleAddToCart}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-primary bg-white py-2.5 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white"
        >
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          Add to Cart
        </button>
      ) : (
        <Link
          href={`/product/${product.slug}`}
          className={`btn-outline w-full text-center text-xs ${isCollection ? "mt-4 py-2.5" : "mt-3"}`}
        >
          EXPLORE NOW
        </Link>
      )}
    </>
  );

  return (
    <article
      className={
        isCollection
          ? `group relative overflow-hidden rounded-[18px] border border-black/[0.06] bg-white shadow-[0_8px_28px_rgba(123,13,43,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_36px_rgba(123,13,43,0.12)] ${
              listView ? "flex gap-4 p-4 sm:gap-5 sm:p-5" : "flex h-full flex-col p-4 sm:p-5"
            }`
          : "card-store group relative flex flex-col"
      }
    >
      {listView && isCollection ? (
        <>
          {imageBlock}
          <div className="flex min-w-0 flex-1 flex-col justify-center">{detailsBlock}</div>
        </>
      ) : (
        <>
          {imageBlock}
          {detailsBlock}
        </>
      )}
    </article>
  );
}
