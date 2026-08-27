import { useState, type ReactNode } from "react";
import { useRouter, type Href } from "expo-router";
import { Alert } from "react-native";

import { HomeProductCard } from "@/components/home/HomeProductCard";
import { NotifyMeModal } from "@/components/catalog/NotifyMeModal";
import { type HomeProduct } from "@/lib/home-data";
import { useWishlist } from "@/providers/WishlistProvider";

type CatalogProductCardProps = {
  product: HomeProduct;
  appearance?: "default" | "wishlist";
  actionSlot?: ReactNode | ((helpers: { openNotify: () => void }) => ReactNode);
  footerSlot?: ReactNode;
};

export function CatalogProductCard({
  product,
  appearance = "default",
  actionSlot,
  footerSlot,
}: CatalogProductCardProps) {
  const router = useRouter();
  const wishlist = useWishlist();
  const [notifyOpen, setNotifyOpen] = useState(false);
  const openNotify = () => setNotifyOpen(true);
  const resolvedActionSlot =
    typeof actionSlot === "function" ? actionSlot({ openNotify }) : actionSlot;

  const openProduct = () => {
    router.push(`/product/${encodeURIComponent(product.slug)}` as Href);
  };

  const toggleWishlist = async () => {
    try {
      await wishlist.toggle({
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        compare_price: product.comparePrice ?? undefined,
        images: product.imageUrl ? [product.imageUrl] : [],
        is_active: true,
        is_new: product.isNew,
        is_bestseller: product.isBestseller,
        status: product.outOfStock ? "out_of_stock" : "active",
      });
    } catch (error) {
      Alert.alert("Wishlist", error instanceof Error ? error.message : "Unable to update wishlist.");
    }
  };

  return (
    <>
      <HomeProductCard
        product={product}
        appearance={appearance}
        onPress={openProduct}
        wished={wishlist.isWished(product.id)}
        onToggleWishlist={() => void toggleWishlist()}
        onNotifyMe={product.outOfStock ? () => setNotifyOpen(true) : undefined}
        actionSlot={resolvedActionSlot}
        footerSlot={footerSlot}
      />
      <NotifyMeModal
        visible={notifyOpen}
        productId={product.id}
        productName={product.name}
        onClose={() => setNotifyOpen(false)}
      />
    </>
  );
}
