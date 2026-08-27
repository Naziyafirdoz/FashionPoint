import { useCallback, useMemo, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";

import { CatalogProductCard } from "@/components/catalog/CatalogProductCard";
import { AppHeader } from "@/components/navigation/AppHeader";
import { PrimaryButton, StatusMessage } from "@/components/ui/form";
import { Brand } from "@/constants/brand";
import { BottomTabInset, MaxContentWidth } from "@/constants/theme";
import { toUserMessage } from "@/lib/api";
import { firstProductImage, isProductOutOfStock, productToCard, resolveVariant, type CatalogProduct } from "@/lib/catalog";
import { useCart } from "@/providers/CartProvider";
import { useWishlist, type WishlistItem } from "@/providers/WishlistProvider";

const CAROUSEL_PADDING = 16;
const CAROUSEL_GAP = 12;
const HEADER_PADDING = 16;

type SymbolName = ComponentProps<typeof SymbolView>["name"];

const FLORAL_LEFT = require("@/assets/home/floral-left.png");
const FLORAL_RIGHT = require("@/assets/home/floral-right.png");
const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function productPrice(item: WishlistItem): number {
  const value = Number(item.product.price);
  return Number.isFinite(value) ? value : 0;
}

function isReadyForBag(item: WishlistItem): boolean {
  return item.product.is_active !== false && !isProductOutOfStock(item.product);
}

/** Website ProductCard local helper: badge + View Product vs Notify Me. Ignores status/is_active. */
function isWishlistCardOutOfStock(product: CatalogProduct): boolean {
  if (product.variants && product.variants.length > 0) {
    return product.variants.every((variant) => Number(variant.stock_quantity) <= 0);
  }
  return product.stock_quantity !== undefined && Number(product.stock_quantity) <= 0;
}

/** Website isProductInStock: used only for Move to Bag readiness. */
function isWishlistProductInStock(product: CatalogProduct): boolean {
  if (product.variants && product.variants.length > 0) {
    return product.variants.some((variant) => Number(variant.stock_quantity) > 0);
  }
  if (product.stock_quantity !== undefined) {
    return Number(product.stock_quantity) > 0;
  }
  return product.status !== "out_of_stock" && product.status !== "archived";
}

/** Website isProductReadyForPurchase. */
function isWishlistReadyForPurchase(product: CatalogProduct): boolean {
  return product.is_active !== false && isWishlistProductInStock(product);
}

function parseCreatedAt(value?: string): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function formatCount(value: number): string {
  return value.toLocaleString("en-IN");
}

function resolveDefaultAvailableVariant(product: CatalogProduct): { size: string; color: string } {
  const colors = product.colors?.length ? product.colors : ["Default"];
  const sizes = product.sizes?.length ? product.sizes : ["M(36)"];
  const color = colors[0];
  const size = sizes.find((entry) => resolveVariant(product, entry, color).inStock) ?? sizes[0];
  return { size, color };
}

export default function WishlistScreen() {
  const router = useRouter();
  const cart = useCart();
  const wishlist = useWishlist();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, MaxContentWidth);
  const cardWidth = Math.round(contentWidth * 0.72);
  const snapInterval = cardWidth + CAROUSEL_GAP;

  useFocusEffect(
    useCallback(() => {
      void wishlist.refresh();
    }, [wishlist.refresh])
  );

  const savedCount = wishlist.items.length;
  const summaries = useMemo(() => {
    const availableCount = wishlist.items.filter((item) => !isProductOutOfStock(item.product)).length;
    const readyCount = wishlist.items.filter(isReadyForBag).length;
    const totalValue = wishlist.items.reduce((sum, item) => sum + productPrice(item), 0);

    const createdTimes = wishlist.items.map((item) => parseCreatedAt(item.created_at));
    const recentlyAddedCount =
      savedCount > 0 && createdTimes.every((time) => time != null)
        ? createdTimes.filter((time) => time! >= Date.now() - RECENT_WINDOW_MS).length
        : null;

    return { availableCount, readyCount, totalValue, recentlyAddedCount };
  }, [savedCount, wishlist.items]);

  const goHome = () => router.push("/" as Href);

  const moveToBag = (productId: string) => {
    const item = wishlist.items.find((row) => row.product_id === productId);
    if (!item) return;
    const product = item.product;
    const { size, color } = resolveDefaultAvailableVariant(product);
    cart.addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      size,
      color,
      quantity: 1,
      image: firstProductImage(product) ?? "",
      slug: product.slug,
    });
    Alert.alert("Moved to bag");
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={[styles.frame, { maxWidth: MaxContentWidth }]}>
          <AppHeader />
          {wishlist.loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={Brand.maroon} />
            </View>
          ) : wishlist.error ? (
            <StatusMessage
              title="Unable to load wishlist"
              message={wishlist.error}
              actionLabel="Try again"
              onAction={() => void wishlist.refresh()}
            />
          ) : (
            <FlatList
              data={savedCount > 0 ? [{ id: "wishlist-carousel" }] : []}
              keyExtractor={(row) => row.id}
              extraData={wishlist.ids}
              style={styles.list}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={savedCount === 0 ? styles.emptyBody : styles.body}
              ListHeaderComponent={
                <View style={styles.headerBlock}>
                  <WishlistHero savedCount={savedCount} />

                  {savedCount > 0 ? (
                    <View style={styles.summaryGrid}>
                      <SummaryCard
                        title="Saved Items"
                        value={formatCount(savedCount)}
                        icon={{ ios: "heart.fill", android: "favorite", web: "favorite" }}
                        iconColor={Brand.maroon}
                      />
                      {summaries.recentlyAddedCount != null ? (
                        <SummaryCard
                          title="Recently Added"
                          value={formatCount(summaries.recentlyAddedCount)}
                          icon={{ ios: "clock", android: "schedule", web: "schedule" }}
                          iconColor={Brand.gold}
                        />
                      ) : null}
                      <SummaryCard
                        title="Available Products"
                        value={formatCount(summaries.availableCount)}
                        icon={{ ios: "tag", android: "sell", web: "sell" }}
                        iconColor={Brand.maroon}
                      />
                      <SummaryCard
                        title="Move to Cart Ready"
                        value={formatCount(summaries.readyCount)}
                        icon={{ ios: "bag", android: "shopping_bag", web: "shopping_bag" }}
                        iconColor={Brand.gold}
                      />
                      <SummaryCard
                        title="Total Wishlist Value"
                        value={`₹${summaries.totalValue.toLocaleString("en-IN")}`}
                        icon={{ ios: "indianrupeesign", android: "currency_rupee", web: "payments" }}
                        iconColor={Brand.maroon}
                      />
                    </View>
                  ) : null}

                  {savedCount > 0 ? (
                    <Text style={styles.listHeading}>
                      {formatCount(savedCount)} Item{savedCount === 1 ? "" : "s"} in your wishlist
                    </Text>
                  ) : null}
                </View>
              }
              ListEmptyComponent={
                <View style={styles.emptyCard}>
                  <View style={styles.emptyHeart}>
                    <Text style={styles.emptyHeartMark}>♡</Text>
                  </View>
                  <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
                  <Text style={styles.emptyCopy}>
                    Save your favourite blouses and access them anytime.
                  </Text>
                  <View style={styles.emptyActions}>
                    <PrimaryButton label="Explore Collections" onPress={goHome} />
                    <PrimaryButton
                      label="Continue Shopping"
                      variant="outline"
                      onPress={goHome}
                    />
                  </View>
                </View>
              }
              ListFooterComponent={
                <Pressable
                  onPress={goHome}
                  accessibilityRole="button"
                  accessibilityLabel="Explore More Collections"
                  style={({ pressed }) => [styles.exploreCta, pressed && styles.explorePressed]}
                >
                  <Text style={styles.exploreCtaText}>Explore More Collections</Text>
                </Pressable>
              }
              renderItem={() => (
                <FlatList
                  horizontal
                  data={wishlist.items}
                  keyExtractor={(item) => item.product_id}
                  extraData={wishlist.ids}
                  nestedScrollEnabled
                  directionalLockEnabled
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  snapToInterval={snapInterval}
                  snapToAlignment="start"
                  disableIntervalMomentum
                  contentContainerStyle={styles.carouselContent}
                  renderItem={({ item, index }) => (
                    <View
                      style={{
                        width: cardWidth,
                        marginRight: index === wishlist.items.length - 1 ? 0 : CAROUSEL_GAP,
                      }}
                    >
                      <CatalogProductCard
                        appearance="wishlist"
                        product={{
                          ...productToCard(item.product),
                          outOfStock: isWishlistCardOutOfStock(item.product),
                        }}
                        actionSlot={({ openNotify }) => (
                          <Pressable
                            onPress={() => {
                              if (!isWishlistReadyForPurchase(item.product)) {
                                openNotify();
                                return;
                              }
                              moveToBag(item.product_id);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Move to Bag"
                            style={({ pressed }) => [
                              styles.compactBag,
                              pressed ? styles.compactPressed : null,
                            ]}
                          >
                            <Text style={styles.compactBagText} numberOfLines={1}>
                              Move to Bag
                            </Text>
                          </Pressable>
                        )}
                        footerSlot={
                          <Pressable
                            onPress={() =>
                              void wishlist.remove(item.product_id).catch((err) =>
                                Alert.alert("Wishlist", toUserMessage(err))
                              )
                            }
                            accessibilityRole="button"
                            accessibilityLabel="Remove"
                            style={({ pressed }) => [
                              styles.compactRemove,
                              pressed ? styles.compactPressed : null,
                            ]}
                          >
                            <Text style={styles.remove}>Remove</Text>
                          </Pressable>
                        }
                      />
                    </View>
                  )}
                />
              )}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function WishlistHero({ savedCount }: { savedCount: number }) {
  return (
    <View style={styles.hero} accessibilityLabel="Wishlist hero">
      <Image source={FLORAL_LEFT} style={styles.floralLeft} contentFit="contain" />
      <Image source={FLORAL_RIGHT} style={styles.floralRight} contentFit="contain" />
      <View style={styles.heroContent}>
        <Text style={styles.heroTitle}>
          Wishlist <Text style={styles.heroHeart}>♡</Text>
        </Text>
        <Text style={styles.heroCopy}>
          Keep your favourite blouses in one place and shop anytime.
        </Text>
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>❤️ Saved Items: {formatCount(savedCount)}</Text>
        </View>
      </View>
    </View>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  iconColor,
}: {
  title: string;
  value: string;
  icon: SymbolName;
  iconColor: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <View style={styles.summaryIcon}>
          <SymbolView name={icon} size={18} tintColor={iconColor} />
        </View>
        <Text style={styles.summaryTitle}>{title}</Text>
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.ivory },
  safe: { flex: 1, alignItems: "center" },
  frame: { flex: 1, width: "100%" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: {
    paddingTop: 20,
    paddingBottom: BottomTabInset + 24,
    gap: 16,
  },
  emptyBody: {
    paddingTop: 20,
    paddingBottom: BottomTabInset + 24,
    gap: 20,
    flexGrow: 1,
  },
  headerBlock: {
    gap: 16,
    marginBottom: 4,
    paddingHorizontal: HEADER_PADDING,
  },
  list: {
    flex: 1,
  },
  carouselContent: {
    paddingLeft: CAROUSEL_PADDING,
    paddingRight: CAROUSEL_PADDING,
  },
  hero: {
    overflow: "hidden",
    borderRadius: 20,
    backgroundColor: "#FFF7F4",
    paddingHorizontal: 24,
    paddingVertical: 32,
    minHeight: 168,
    shadowColor: Brand.maroon,
    shadowOpacity: 0.06,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  floralLeft: {
    position: "absolute",
    left: -8,
    bottom: 0,
    width: "34%",
    maxWidth: 170,
    height: 140,
    opacity: 0.9,
  },
  floralRight: {
    position: "absolute",
    right: -8,
    bottom: 0,
    width: "34%",
    maxWidth: 170,
    height: 140,
    opacity: 0.9,
  },
  heroContent: {
    zIndex: 1,
    alignItems: "center",
    gap: 8,
  },
  heroTitle: {
    fontFamily: Brand.displayFont,
    fontSize: 32,
    fontWeight: "700",
    color: Brand.maroon,
    textAlign: "center",
  },
  heroHeart: {
    color: Brand.maroon,
  },
  heroCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: "#555555",
    textAlign: "center",
    maxWidth: 320,
  },
  countPill: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: Brand.maroon,
    paddingHorizontal: 16,
    paddingVertical: 6,
    shadowColor: Brand.maroon,
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  countPillText: {
    color: Brand.white,
    fontSize: 14,
    fontWeight: "600",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryCard: {
    width: "47%",
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3E5E8",
    backgroundColor: Brand.white,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: Brand.maroon,
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.blush,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "#888888",
  },
  summaryValue: {
    marginTop: 12,
    fontFamily: Brand.displayFont,
    fontSize: 24,
    fontWeight: "700",
    color: Brand.ink,
  },
  listHeading: {
    fontFamily: Brand.displayFont,
    fontSize: 18,
    fontWeight: "700",
    color: Brand.ink,
  },
  compactBag: {
    width: "100%",
    minHeight: 36,
    borderRadius: 999,
    backgroundColor: Brand.maroon,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  compactBagDisabled: {
    opacity: 0.45,
  },
  compactPressed: {
    opacity: 0.88,
  },
  compactBagText: {
    color: Brand.white,
    fontSize: 12,
    fontWeight: "700",
  },
  compactRemove: {
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  remove: { textAlign: "center", color: "#888888", fontWeight: "500", fontSize: 12 },
  emptyCard: {
    alignItems: "center",
    paddingHorizontal: HEADER_PADDING,
    paddingVertical: 48,
    gap: 8,
  },
  emptyHeart: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: "#F3E5E8",
    backgroundColor: Brand.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: Brand.maroon,
    shadowOpacity: 0.06,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 8 },
  },
  emptyHeartMark: {
    fontSize: 36,
    color: "rgba(123, 13, 43, 0.7)",
  },
  emptyTitle: {
    fontFamily: Brand.displayFont,
    fontSize: 24,
    fontWeight: "700",
    color: Brand.ink,
    textAlign: "center",
  },
  emptyCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: "#666666",
    textAlign: "center",
    maxWidth: 280,
    marginBottom: 16,
  },
  emptyActions: {
    width: "100%",
    gap: 12,
  },
  exploreCta: {
    alignSelf: "center",
    marginTop: 8,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: Brand.maroon,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Brand.maroon,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 5 },
  },
  explorePressed: {
    opacity: 0.88,
  },
  exploreCtaText: {
    color: Brand.white,
    fontSize: 14,
    fontWeight: "600",
  },
});
