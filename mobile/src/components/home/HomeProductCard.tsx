import { type ReactNode } from "react";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { Brand } from "@/constants/brand";
import { formatInr, getDiscountPercent, type HomeProduct } from "@/lib/home-data";

type HomeProductCardProps = {
  product: HomeProduct;
  onPress?: () => void;
  wished?: boolean;
  onToggleWishlist?: () => void;
  onNotifyMe?: () => void;
  appearance?: "default" | "wishlist";
  actionSlot?: ReactNode;
  footerSlot?: ReactNode;
};

export function HomeProductCard({
  product,
  onPress,
  wished = false,
  onToggleWishlist,
  onNotifyMe,
  appearance = "default",
  actionSlot,
  footerSlot,
}: HomeProductCardProps) {
  const discount = getDiscountPercent(product.price, product.comparePrice);
  const wishlistLook = appearance === "wishlist";
  const compactActionRow = wishlistLook && actionSlot != null;

  const viewProductButton = (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${product.name}`}
      style={({ pressed }) => [
        styles.viewBtn,
        wishlistLook ? styles.wishlistViewBtn : null,
        compactActionRow ? styles.wishlistViewBtnInRow : null,
        pressed && onPress ? styles.viewPressed : null,
      ]}
    >
      {compactActionRow ? null : (
        <SymbolView
          name={{ ios: "eye", android: "visibility", web: "visibility" }}
          size={wishlistLook ? 11 : 13}
          tintColor={Brand.maroon}
        />
      )}
      <Text
        numberOfLines={1}
        style={[styles.viewText, wishlistLook ? styles.wishlistViewText : null]}
      >
        View Product
      </Text>
    </Pressable>
  );

  const notifyMeButton = (
    <Pressable
      onPress={onNotifyMe}
      accessibilityRole="button"
      accessibilityLabel={`Notify me about ${product.name}`}
      style={({ pressed }) => [
        styles.viewBtn,
        styles.notifyBtn,
        wishlistLook ? styles.wishlistViewBtn : null,
        compactActionRow ? styles.wishlistViewBtnInRow : null,
        pressed ? styles.viewPressed : null,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[styles.notifyText, wishlistLook ? styles.wishlistViewText : null]}
      >
        Notify Me
      </Text>
    </Pressable>
  );

  return (
    <View style={[styles.card, wishlistLook ? styles.wishlistCard : null]}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={product.name}
        style={[styles.imageLink, wishlistLook ? styles.wishlistImageLink : null]}
      >
        <View style={styles.imageFrame}>
          {product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              style={styles.image}
              contentFit="contain"
              transition={200}
            />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>No image available</Text>
            </View>
          )}
        </View>

        <View style={styles.badges}>
          {product.outOfStock ? (
            <View style={[styles.badge, styles.badgeMuted]}>
              <Text style={styles.badgeText}>Out of Stock</Text>
            </View>
          ) : null}
          {product.isNew && !product.outOfStock ? (
            <View style={[styles.badge, styles.badgeNew]}>
              <Text style={styles.badgeText}>New</Text>
            </View>
          ) : null}
          {product.isBestseller && !product.outOfStock ? (
            <View style={[styles.badge, styles.badgeGold]}>
              <Text style={styles.badgeText}>Bestseller</Text>
            </View>
          ) : null}
        </View>

        <Pressable
          onPress={onToggleWishlist}
          disabled={!onToggleWishlist}
          hitSlop={wishlistLook ? 8 : 6}
          accessibilityRole="button"
          accessibilityLabel={wished ? "Remove from wishlist" : "Add to wishlist"}
          style={[styles.heart, wishlistLook ? styles.wishlistHeart : null]}
        >
          <SymbolView
            name={{ ios: wished ? "heart.fill" : "heart", android: "favorite", web: "favorite" }}
            size={14}
            tintColor={Brand.maroon}
          />
        </Pressable>
      </Pressable>

      <Text numberOfLines={2} style={[styles.name, wishlistLook ? styles.wishlistName : null]}>
        {product.name}
      </Text>

      <View style={[styles.priceRow, wishlistLook ? styles.wishlistPriceRow : null]}>
        <Text style={[styles.price, wishlistLook ? styles.wishlistPrice : null]}>
          {formatInr(product.price)}
        </Text>
        {product.comparePrice ? (
          <Text style={[styles.compare, wishlistLook ? styles.wishlistCompare : null]}>
            {formatInr(product.comparePrice)}
          </Text>
        ) : null}
        {discount ? (
          <View style={styles.offPill}>
            <Text style={styles.offText}>{discount}% off</Text>
          </View>
        ) : null}
      </View>

      {compactActionRow ? (
        <View style={styles.wishlistActionRow}>
          <View style={styles.wishlistActionHalf}>
            {product.outOfStock && onNotifyMe ? notifyMeButton : viewProductButton}
          </View>
          <View style={styles.wishlistActionHalf}>{actionSlot}</View>
        </View>
      ) : (
        viewProductButton
      )}
      {!compactActionRow && product.outOfStock && onNotifyMe ? notifyMeButton : null}
      {footerSlot}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: Brand.white,
    paddingHorizontal: 6,
    paddingVertical: 12,
    shadowColor: Brand.maroon,
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  wishlistCard: {
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  imageLink: {
    width: "100%",
    aspectRatio: 50 / 49,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: Brand.white,
  },
  wishlistImageLink: {
    aspectRatio: 13 / 10,
  },
  imageFrame: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
    transform: [{ scale: 1.08 }],
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "#999999",
    fontSize: 12,
  },
  badges: {
    position: "absolute",
    top: 6,
    left: 6,
    gap: 4,
  },
  badge: {
    height: 18,
    borderRadius: 999,
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  badgeNew: {
    backgroundColor: Brand.maroon,
  },
  badgeGold: {
    backgroundColor: Brand.gold,
  },
  badgeMuted: {
    backgroundColor: Brand.muted,
  },
  badgeText: {
    color: Brand.white,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  heart: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  wishlistHeart: {
    width: 32,
    height: 32,
    borderRadius: 16,
    top: 4,
    right: 4,
  },
  name: {
    marginTop: 10,
    minHeight: 42,
    paddingLeft: 8,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
    color: Brand.ink,
  },
  wishlistName: {
    minHeight: 32,
    marginTop: 6,
    paddingLeft: 4,
    fontSize: 12,
    lineHeight: 16,
  },
  priceRow: {
    marginTop: 6,
    paddingLeft: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: 8,
  },
  wishlistPriceRow: {
    marginTop: 4,
    paddingLeft: 4,
    gap: 6,
  },
  price: {
    fontSize: 18,
    fontWeight: "800",
    color: Brand.maroon,
  },
  wishlistPrice: {
    fontSize: 15,
  },
  compare: {
    fontSize: 12,
    color: "#9A9A9A",
    textDecorationLine: "line-through",
  },
  wishlistCompare: {
    fontSize: 11,
  },
  offPill: {
    borderRadius: 999,
    backgroundColor: Brand.discountBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  offText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: Brand.discount,
  },
  viewBtn: {
    marginTop: 10,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(123, 13, 43, 0.5)",
    backgroundColor: Brand.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  wishlistViewBtn: {
    marginTop: 8,
    height: 36,
    gap: 4,
    paddingHorizontal: 6,
  },
  wishlistActionRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 6,
  },
  wishlistActionHalf: {
    flex: 1,
    minWidth: 0,
  },
  wishlistViewBtnInRow: {
    marginTop: 0,
    paddingHorizontal: 4,
  },
  viewPressed: {
    opacity: 0.85,
  },
  viewText: {
    fontSize: 12,
    fontWeight: "700",
    color: Brand.maroon,
  },
  wishlistViewText: {
    fontSize: 11,
    flexShrink: 1,
  },
  notifyBtn: {
    backgroundColor: Brand.maroon,
    borderColor: Brand.maroon,
  },
  notifyText: {
    fontSize: 12,
    fontWeight: "700",
    color: Brand.white,
  },
});
