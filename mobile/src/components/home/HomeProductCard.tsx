import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { Brand } from "@/constants/brand";
import { formatInr, type HomeProduct } from "@/lib/home-data";

export function HomeProductCard({ product }: { product: HomeProduct }) {
  const showCompare =
    product.comparePrice != null && product.comparePrice > product.price;

  return (
    <View style={styles.card}>
      <View style={styles.imageWrap}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Fashion Point</Text>
          </View>
        )}
        {product.isNew ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>New</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={2} style={styles.name}>
        {product.name}
      </Text>
      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatInr(product.price)}</Text>
        {showCompare ? (
          <Text style={styles.compare}>{formatInr(product.comparePrice!)}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  imageWrap: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: Brand.blush,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    aspectRatio: 3 / 4,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: Brand.maroon,
    fontSize: 12,
    fontWeight: "600",
  },
  badge: {
    position: "absolute",
    top: 10,
    left: 10,
    borderRadius: 999,
    backgroundColor: Brand.maroon,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: Brand.white,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  name: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: Brand.ink,
  },
  priceRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  price: {
    fontSize: 14,
    fontWeight: "700",
    color: Brand.maroon,
  },
  compare: {
    fontSize: 12,
    color: Brand.muted,
    textDecorationLine: "line-through",
  },
});
