"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { ShoppingBag, Trash2 } from "lucide-react";
import { ProductCard } from "@/components/store/ProductCard";
import { OutOfStockModal } from "@/components/store/OutOfStockModal";
import { createClient } from "@/lib/supabase/client";
import { isProductReadyForPurchase } from "@/lib/wishlist/product-stock";
import { isSizeUnavailableForColor } from "@/lib/products/variants";
import { useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlist";
import type { ProductReviewSummary } from "@/lib/reviews/types";
import type { Product } from "@/types";

type WishlistProductItemProps = {
  wishlistId: string;
  product: Product;
  reviewSummary?: ProductReviewSummary | null;
  listView?: boolean;
  onRemoved: (wishlistId: string) => void;
};

const MOVE_TO_BAG_BTN =
  "inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-full bg-[#7B0D2B] text-xs font-semibold text-white shadow-[0_3px_10px_rgba(122,13,43,0.12)] transition duration-300 hover:bg-[#8f1230] hover:shadow-[0_5px_14px_rgba(123,13,43,0.18)]";

function resolveDefaultVariant(product: Product): { size: string; color: string } {
  const colors = product.colors?.length ? product.colors : ["Default"];
  const sizes = product.sizes?.length ? product.sizes : ["M(36)"];
  const color = colors[0];
  const size =
    sizes.find((entry) => !isSizeUnavailableForColor(product, entry, color)) ?? sizes[0];

  return { size, color };
}

export function WishlistProductItem({
  wishlistId,
  product,
  reviewSummary,
  listView = false,
  onRemoved
}: WishlistProductItemProps) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const removeId = useWishlistStore((state) => state.removeId);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [bagPulse, setBagPulse] = useState(false);

  const handleMoveToBag = () => {
    if (!isProductReadyForPurchase(product)) {
      setNotifyOpen(true);
      return;
    }

    const { size, color } = resolveDefaultVariant(product);
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
    setBagPulse(true);
    window.setTimeout(() => setBagPulse(false), 400);
    toast.success("Moved to bag");
  };

  const handleRemove = async () => {
    if (pending) return;
    setPending(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.from("wishlist").delete().eq("id", wishlistId);

      if (error) {
        toast.error("Could not remove item");
        return;
      }

      if (useWishlistStore.getState().has(product.id)) {
        removeId(product.id);
      }

      onRemoved(wishlistId);
      toast.success("Removed from wishlist");
      router.refresh();
    } catch {
      toast.error("Could not remove item");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <ProductCard
        product={product}
        reviewSummary={reviewSummary}
        variant="wishlist"
        listView={listView}
        onNotify={() => setNotifyOpen(true)}
        actionSlot={
          <motion.button
            type="button"
            onClick={handleMoveToBag}
            animate={bagPulse ? { scale: [1, 1.02, 1] } : { scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={MOVE_TO_BAG_BTN}
          >
            <ShoppingBag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Move to Bag
          </motion.button>
        }
        footerSlot={
          <button
            type="button"
            onClick={handleRemove}
            disabled={pending}
            className="inline-flex items-center justify-center gap-1.5 py-0.5 text-xs font-medium text-[#888888] transition duration-200 hover:text-[#7B0D2B] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Remove
          </button>
        }
      />
      <OutOfStockModal
        open={notifyOpen}
        onClose={() => setNotifyOpen(false)}
        productId={product.id}
        productName={product.name}
      />
    </>
  );
}
