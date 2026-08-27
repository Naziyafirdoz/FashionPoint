import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { Brand } from "@/constants/brand";
import { type HomeCategory } from "@/lib/home-data";

const THEME_GRADIENTS: Record<string, [string, string]> = {
  blush: ["#FFF0F3", "#FFE4EC"],
  rose: ["#FFF0F5", "#FFE0EA"],
  peach: ["#FFF5F0", "#FFE8DC"],
  cream: ["#FFFBF4", "#F8F0E4"],
  gold: ["#FBF6EE", "#F2E8D4"],
  lavender: ["#F7F2FF", "#EDE4FF"],
  lilac: ["#F8F3FF", "#EAE0FF"],
  sky: ["#EFF8FF", "#E0F0FF"],
  mint: ["#F0FAF8", "#E2F2EE"],
  sage: ["#F2F7F2", "#E4EEE4"],
  coral: ["#FFF3F0", "#FFE4DC"],
  pearl: ["#FFFCFA", "#F5F0EC"],
  sand: ["#FAF6F1", "#F0E8DC"],
  maroon: ["#FBF0F3", "#F3E0E6"],
  emerald: ["#EFF8F4", "#DCEFE6"],
};

type HomeCollectionsProps = {
  categories: HomeCategory[];
  onCategoryPress: (category: HomeCategory) => void;
};

export function HomeCollections({ categories, onCategoryPress }: HomeCollectionsProps) {
  const { width } = useWindowDimensions();
  const bannerWidth = Math.min(width - 48, 320);
  const legacyWidth = Math.min(width - 72, 240);

  if (categories.length === 0) return null;

  return (
    <View style={styles.section}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.track}
        decelerationRate="fast"
        snapToAlignment="start"
      >
        {categories.map((category) =>
          category.bannerUrl ? (
            <Pressable
              key={category.id}
              onPress={() => onCategoryPress(category)}
              accessibilityRole="button"
              accessibilityLabel={`View ${category.name} collection`}
              style={({ pressed }) => [
                styles.bannerCard,
                { width: bannerWidth },
                pressed && styles.pressed,
              ]}
            >
              <Image
                source={{ uri: category.bannerUrl }}
                style={styles.bannerImage}
                contentFit="cover"
              />
            </Pressable>
          ) : (
            <Pressable
              key={category.id}
              onPress={() => onCategoryPress(category)}
              accessibilityRole="button"
              accessibilityLabel={`View ${category.name} collection`}
              style={({ pressed }) => [
                styles.legacyCard,
                { width: legacyWidth },
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    experimental_backgroundImage: `linear-gradient(160deg, ${
                      (THEME_GRADIENTS[category.theme] ?? THEME_GRADIENTS.blush)[0]
                    }, ${(THEME_GRADIENTS[category.theme] ?? THEME_GRADIENTS.blush)[1]})`,
                    backgroundColor: (THEME_GRADIENTS[category.theme] ?? THEME_GRADIENTS.blush)[0],
                  },
                ]}
              />
              <View style={styles.legacyCopy}>
                <Text style={styles.legacyTitle}>{category.name}</Text>
                <View style={styles.legacyRule} />
                <Text numberOfLines={3} style={styles.legacyDescription}>
                  {category.description}
                </Text>
                <Text style={styles.legacyCta}>
                  {category.buttonText} →
                </Text>
              </View>
              {category.imageUrl ? (
                <Image
                  source={{ uri: category.imageUrl }}
                  style={styles.legacyImage}
                  contentFit="contain"
                />
              ) : null}
            </Pressable>
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  track: {
    paddingHorizontal: 16,
    gap: 14,
    paddingVertical: 8,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ translateY: 1 }],
  },
  bannerCard: {
    aspectRatio: 16 / 9,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: Brand.maroon,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  legacyCard: {
    height: 310,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: Brand.maroon,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  legacyCopy: {
    zIndex: 2,
    maxWidth: "58%",
    paddingTop: 22,
    paddingLeft: 18,
    paddingRight: 8,
    paddingBottom: 18,
    flex: 1,
  },
  legacyTitle: {
    fontFamily: Brand.displayFont,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 28,
    color: Brand.maroon,
  },
  legacyRule: {
    marginTop: 10,
    width: 36,
    height: 2,
    borderRadius: 999,
    backgroundColor: "rgba(123, 13, 43, 0.35)",
  },
  legacyDescription: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(42, 42, 42, 0.55)",
  },
  legacyCta: {
    marginTop: "auto",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: Brand.maroon,
  },
  legacyImage: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: "48%",
    height: "62%",
  },
});
