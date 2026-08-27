import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { NotifyMeModal } from "@/components/catalog/NotifyMeModal";
import { StackHeader } from "@/components/navigation/StackHeader";
import { PrimaryButton } from "@/components/ui/form";
import { Brand } from "@/constants/brand";
import { MaxContentWidth } from "@/constants/theme";
import { resolveMediaUrl, toUserMessage } from "@/lib/api";
import {
  FALLBACK_SIZES,
  fetchProductBySlug,
  firstProductImage,
  formatInr,
  getDiscountPercent,
  resolveVariant,
  type CatalogProduct,
} from "@/lib/catalog";
import { useCart } from "@/providers/CartProvider";
import { useWishlist } from "@/providers/WishlistProvider";

export default function ProductScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const cart = useCart();
  const wishlist = useWishlist();
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!slug) {
      setError("This product is unavailable.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const next = await fetchProductBySlug(slug);
      setProduct(next);
      const swatches =
        next.color_swatches ?? (next.colors ?? []).map((name) => ({ name, hex: null }));
      const defaultColor = swatches[0]?.name ?? next.colors?.[0] ?? "Default";
      const sizes = next.sizes?.length ? next.sizes : FALLBACK_SIZES;
      const defaultSize =
        sizes.find((value) => resolveVariant(next, value, defaultColor).inStock) ?? sizes[0] ?? "";
      setColor(defaultColor);
      setSize(defaultSize);
      setError(null);
    } catch (err) {
      setProduct(null);
      setError(toUserMessage(err, "This product could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const selection = useMemo(
    () => (product ? resolveVariant(product, size, color) : null),
    [product, size, color]
  );
  const images = useMemo(
    () =>
      (product?.images ?? [])
        .map((image) => resolveMediaUrl(image))
        .filter((image): image is string => Boolean(image)),
    [product]
  );
  const colors =
    product?.color_swatches?.map((swatch) => swatch.name) ?? product?.colors ?? [];
  const sizes = product?.sizes?.length ? product.sizes : FALLBACK_SIZES;
  const outOfStock = !selection?.inStock;
  const discount = selection
    ? getDiscountPercent(selection.price, selection.comparePrice ?? null)
    : null;

  const lineItem = () => {
    if (!product || !selection) return null;
    return {
      productId: product.id,
      name: product.name,
      price: selection.price,
      size,
      color,
      quantity: 1,
      image: firstProductImage(product) ?? "",
      slug: product.slug,
    };
  };

  const addToBag = () => {
    const item = lineItem();
    if (!item || outOfStock) {
      Alert.alert("Unavailable", "This size and color is out of stock.");
      return;
    }
    cart.addItem(item);
    Alert.alert("Added to bag", `${product?.name} is in your bag.`);
  };

  const buyNow = () => {
    const item = lineItem();
    if (!item || outOfStock) {
      Alert.alert("Unavailable", "This size and color is out of stock.");
      return;
    }
    cart.startBuyNow(item);
    router.push("/checkout?mode=buy_now" as Href);
  };

  const toggleWishlist = async () => {
    if (!product) return;
    setBusy(true);
    try {
      await wishlist.toggle(product);
    } catch (err) {
      Alert.alert("Wishlist", toUserMessage(err, "Unable to update wishlist."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={[styles.frame, { maxWidth: MaxContentWidth }]}>
          <StackHeader title="Product" />
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={Brand.maroon} />
            </View>
          ) : error || !product ? (
            <View style={styles.centered}>
              <Text style={styles.errorTitle}>Product unavailable</Text>
              <Text style={styles.errorText}>{error ?? "This blouse could not be found."}</Text>
              <PrimaryButton label="Back to shop" onPress={() => router.replace("/shop" as Href)} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                {(images.length ? images : [null]).map((image, index) => (
                  <View key={`${image}-${index}`} style={styles.imageFrame}>
                    {image ? (
                      <Image source={{ uri: image }} style={styles.image} contentFit="contain" />
                    ) : (
                      <Text style={styles.placeholder}>No image available</Text>
                    )}
                  </View>
                ))}
              </ScrollView>

              {product.is_bestseller ? <Text style={styles.bestseller}>Bestseller</Text> : null}
              <Text style={styles.name}>{product.name}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>{formatInr(selection?.price ?? product.price)}</Text>
                {selection?.comparePrice ? (
                  <Text style={styles.compare}>{formatInr(selection.comparePrice)}</Text>
                ) : null}
                {discount ? <Text style={styles.off}>{discount}% off</Text> : null}
              </View>
              <Text style={styles.stock}>
                {outOfStock ? "Out of stock" : `${selection?.stock} available`}
              </Text>

              {product.short_description ? (
                <Text style={styles.description}>{product.short_description}</Text>
              ) : null}

              {colors.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Color</Text>
                  <View style={styles.pills}>
                    {colors.map((value) => (
                      <Pressable
                        key={value}
                        onPress={() => setColor(value)}
                        style={[styles.pill, color === value ? styles.pillActive : null]}
                      >
                        <Text style={[styles.pillText, color === value ? styles.pillTextActive : null]}>
                          {value}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Size</Text>
                <View style={styles.pills}>
                  {sizes.map((value) => {
                    const unavailable = !resolveVariant(product, value, color || "Default").inStock;
                    return (
                      <Pressable
                        key={value}
                        onPress={() => setSize(value)}
                        disabled={unavailable}
                        style={[
                          styles.pill,
                          size === value ? styles.pillActive : null,
                          unavailable ? styles.pillDisabled : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            size === value ? styles.pillTextActive : null,
                            unavailable ? styles.pillTextDisabled : null,
                          ]}
                        >
                          {value}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.info}>
                {[
                  ["Fabric", product.fabric],
                  ["Neck", product.neck_type],
                  ["Sleeve", product.sleeve_type],
                  ["Closure", product.closure_type],
                ].map(([label, value]) =>
                  value ? (
                    <View key={label} style={styles.infoRow}>
                      <Text style={styles.infoLabel}>{label}</Text>
                      <Text style={styles.infoValue}>{value}</Text>
                    </View>
                  ) : null
                )}
              </View>

              {product.detailed_description ? (
                <Text style={styles.description}>{product.detailed_description}</Text>
              ) : null}

              {outOfStock ? (
                <PrimaryButton label="Notify Me" onPress={() => setNotifyOpen(true)} />
              ) : (
                <View style={styles.actions}>
                  <PrimaryButton label="Add to bag" onPress={addToBag} />
                  <PrimaryButton label="Buy now" variant="outline" onPress={buyNow} />
                </View>
              )}
              <PrimaryButton
                label={wishlist.isWished(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                variant="outline"
                onPress={() => void toggleWishlist()}
                disabled={busy}
              />
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
      {product ? (
        <NotifyMeModal
          visible={notifyOpen}
          productId={product.id}
          productName={product.name}
          onClose={() => setNotifyOpen(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.ivory },
  safe: { flex: 1, alignItems: "center" },
  frame: { flex: 1, width: "100%" },
  body: { padding: 16, paddingBottom: 40, gap: 12 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  imageFrame: {
    width: 320,
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: Brand.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  placeholder: { color: Brand.muted },
  bestseller: {
    alignSelf: "flex-start",
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: Brand.maroon,
    color: Brand.white,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  name: { fontFamily: Brand.displayFont, fontSize: 28, color: Brand.maroon },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  price: { fontSize: 24, fontWeight: "800", color: Brand.maroon },
  compare: { fontSize: 14, color: Brand.muted, textDecorationLine: "line-through" },
  off: { color: Brand.discount, fontWeight: "800" },
  stock: { fontSize: 13, color: Brand.muted },
  description: { fontSize: 15, lineHeight: 22, color: Brand.ink },
  section: { gap: 8 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: Brand.gold,
  },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Brand.white,
  },
  pillActive: { backgroundColor: Brand.maroon, borderColor: Brand.maroon },
  pillDisabled: { opacity: 0.4 },
  pillText: { color: Brand.maroon, fontWeight: "700" },
  pillTextActive: { color: Brand.white },
  pillTextDisabled: { textDecorationLine: "line-through" },
  info: { gap: 8 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  infoLabel: { color: Brand.muted, fontSize: 13, textTransform: "uppercase" },
  infoValue: { color: Brand.ink, fontWeight: "600", flex: 1, textAlign: "right" },
  actions: { gap: 10 },
  errorTitle: { fontFamily: Brand.displayFont, fontSize: 22, color: Brand.maroon },
  errorText: { color: Brand.muted, textAlign: "center" },
});
