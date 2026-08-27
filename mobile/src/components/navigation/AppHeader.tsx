import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";

import { Brand } from "@/constants/brand";
import { useCart } from "@/providers/CartProvider";

const LOGO = require("@/assets/brand/fashion-point-logo.png");

export function AppHeader() {
  const router = useRouter();
  const { count: cartCount } = useCart();

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Pressable
          onPress={() => router.replace("/" as Href)}
          accessibilityRole="button"
          accessibilityLabel="Fashion Point home"
          style={({ pressed }) => [styles.brand, pressed && styles.pressed]}
        >
          <Image source={LOGO} style={styles.logo} contentFit="contain" />
          <View style={styles.brandCopy}>
            <Text style={styles.storeName}>{Brand.name}</Text>
            <Text style={styles.tagline}>{Brand.tagline}</Text>
          </View>
        </Pressable>

        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push("/search")}
            accessibilityRole="button"
            accessibilityLabel="Search blouses"
            hitSlop={8}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <SymbolView
              name={{ ios: "magnifyingglass", android: "search", web: "search" }}
              size={20}
              tintColor={Brand.maroon}
            />
          </Pressable>

          <Pressable
            onPress={() => router.push("/cart")}
            accessibilityRole="button"
            accessibilityLabel={cartCount > 0 ? `Bag, ${cartCount} items` : "Bag"}
            hitSlop={8}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <SymbolView
              name={{ ios: "bag", android: "shopping_bag", web: "shopping_bag" }}
              size={20}
              tintColor={Brand.maroon}
            />
            {cartCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount > 9 ? "9+" : cartCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: Brand.white,
    borderBottomWidth: 1,
    borderBottomColor: Brand.blushBorder,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  brand: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logo: {
    width: 31,
    height: 44,
  },
  brandCopy: {
    flexShrink: 1,
  },
  storeName: {
    fontFamily: Brand.displayFont,
    fontSize: 24,
    fontWeight: "700",
    color: Brand.maroon,
    letterSpacing: 0.2,
  },
  tagline: {
    marginTop: 1,
    fontSize: 12,
    color: Brand.muted,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: Brand.white,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Brand.maroon,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: Brand.white,
    fontSize: 9,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.72,
  },
});
