import { Pressable, StyleSheet, Text, View } from "react-native";

import { Brand } from "@/constants/brand";

const FEATURES = ["Ready-made", "Premium Quality", "Perfect Fit", "Comfortable All Day"];

type HomeHeroProps = {
  onShopPress: () => void;
};

export function HomeHero({ onShopPress }: HomeHeroProps) {
  return (
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>Premium Ready-Made Indian Blouses</Text>
      <Text style={styles.title}>
        Style <Text style={styles.ampersand}>&</Text>
        {"\n"}Confidence
      </Text>
      <Text style={styles.subtitle}>For every occasion — crafted for the modern Indian woman</Text>

      <View style={styles.chips}>
        {FEATURES.map((feature) => (
          <View key={feature} style={styles.chip}>
            <Text style={styles.chipMark}>✦</Text>
            <Text style={styles.chipText}>{feature}</Text>
          </View>
        ))}
      </View>

      <Pressable
        onPress={onShopPress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
      >
        <Text style={styles.ctaText}>Shop ready-made blouses</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginHorizontal: 20,
    marginTop: 4,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 28,
    backgroundColor: Brand.maroon,
    overflow: "hidden",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.72)",
  },
  title: {
    marginTop: 12,
    fontFamily: Brand.displayFont,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: "700",
    color: Brand.white,
  },
  ampersand: {
    fontFamily: Brand.displayFont,
    fontStyle: "italic",
    color: Brand.gold,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.78)",
  },
  chips: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipMark: {
    color: Brand.gold,
    fontSize: 10,
  },
  chipText: {
    color: Brand.white,
    fontSize: 12,
  },
  cta: {
    marginTop: 22,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: Brand.white,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  ctaPressed: {
    opacity: 0.88,
  },
  ctaText: {
    color: Brand.maroon,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
