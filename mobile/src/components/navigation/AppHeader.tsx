import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";

import { Brand } from "@/constants/brand";

export function AppHeader() {
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Pressable
          onPress={() => router.replace("/")}
          accessibilityRole="button"
          accessibilityLabel="Fashion Point home"
          style={({ pressed }) => [styles.brand, pressed && styles.pressed]}
        >
          <Text style={styles.storeName}>{Brand.name}</Text>
          <Text style={styles.tagline}>{Brand.tagline}</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/cart")}
          accessibilityRole="button"
          accessibilityLabel="Bag"
          hitSlop={8}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <SymbolView
            name={{ ios: "bag", android: "shopping_bag", web: "shopping_bag" }}
            size={22}
            tintColor={Brand.maroon}
          />
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.push("/search")}
        accessibilityRole="search"
        accessibilityLabel="Search blouses"
        style={({ pressed }) => [styles.search, pressed && styles.searchPressed]}
      >
        <SymbolView
          name={{ ios: "magnifyingglass", android: "search", web: "search" }}
          size={18}
          tintColor={Brand.maroon}
        />
        <Text style={styles.searchPlaceholder}>Search blouses, fabrics, occasions</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: Brand.ivory,
    borderBottomWidth: 1,
    borderBottomColor: Brand.blushBorder,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  brand: {
    flex: 1,
  },
  storeName: {
    fontFamily: Brand.displayFont,
    fontSize: 26,
    fontWeight: "700",
    color: Brand.maroon,
    letterSpacing: 0.2,
  },
  tagline: {
    marginTop: 2,
    fontSize: 12,
    color: Brand.muted,
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
  pressed: {
    opacity: 0.72,
  },
  search: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: Brand.white,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchPressed: {
    backgroundColor: Brand.blush,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: Brand.muted,
  },
});
