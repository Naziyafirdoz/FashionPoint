import { Pressable, StyleSheet, Text, View } from "react-native";

import { Brand } from "@/constants/brand";

type HomeHeaderProps = {
  onSearchPress: () => void;
};

function HeaderIcon({ label, glyph }: { label: string; glyph: string }) {
  return (
    <View accessible accessibilityLabel={label} style={styles.iconButton}>
      <Text style={styles.iconGlyph}>{glyph}</Text>
    </View>
  );
}

export function HomeHeader({ onSearchPress }: HomeHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <View style={styles.brand}>
          <Text style={styles.storeName}>{Brand.name}</Text>
          <Text style={styles.tagline}>{Brand.tagline}</Text>
        </View>
        <View style={styles.actions}>
          <HeaderIcon label="Wishlist" glyph="♡" />
          <HeaderIcon label="Bag" glyph="Bag" />
        </View>
      </View>

      <Pressable
        onPress={onSearchPress}
        accessibilityRole="search"
        accessibilityLabel="Search blouses"
        style={({ pressed }) => [styles.search, pressed && styles.searchPressed]}
      >
        <Text style={styles.searchGlyph}>⌕</Text>
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
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: Brand.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  iconGlyph: {
    fontSize: 13,
    fontWeight: "600",
    color: Brand.maroon,
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
  searchGlyph: {
    fontSize: 18,
    color: Brand.maroon,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: Brand.muted,
  },
});
