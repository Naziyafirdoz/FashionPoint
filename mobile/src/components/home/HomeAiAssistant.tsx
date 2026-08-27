import { Pressable, StyleSheet, Text, View } from "react-native";
import { SymbolView, type AndroidSymbol, type SFSymbol } from "expo-symbols";

import { Brand } from "@/constants/brand";

type AiFeature = {
  label: string;
  detail: string;
  ios: SFSymbol;
  android: AndroidSymbol;
  tint: string;
  bg: string;
};

const FEATURES: AiFeature[] = [
  {
    label: "AI Size Finder",
    detail: "Find your perfect fit in seconds",
    ios: "ruler",
    android: "straighten",
    tint: Brand.gold,
    bg: "rgba(184, 134, 11, 0.15)",
  },
  {
    label: "Color Match",
    detail: "Match with your saree",
    ios: "paintpalette.fill",
    android: "palette",
    tint: Brand.maroon,
    bg: "rgba(123, 13, 43, 0.1)",
  },
  {
    label: "Style Assistant",
    detail: "Personalized style picks",
    ios: "sparkles",
    android: "auto_awesome",
    tint: "#9b4d6d",
    bg: "rgba(155, 77, 109, 0.1)",
  },
];

type HomeAiAssistantProps = {
  onStylePress?: () => void;
  onSizePress?: () => void;
  onColorPress?: () => void;
};

export function HomeAiAssistant({
  onStylePress,
  onSizePress,
  onColorPress,
}: HomeAiAssistantProps) {
  const featurePress: Record<string, (() => void) | undefined> = {
    "AI Size Finder": onSizePress,
    "Color Match": onColorPress,
    "Style Assistant": onStylePress,
  };
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.heading}>
          <View style={styles.iconBadge}>
            <SymbolView
              name={{ ios: "sparkles", android: "auto_awesome", web: "auto_awesome" }}
              size={18}
              tintColor={Brand.gold}
            />
          </View>
          <View style={styles.headingCopy}>
            <Text style={styles.title}>AI STYLE ASSISTANT</Text>
            <Text style={styles.subtitle}>Your personal blouse expert</Text>
          </View>
        </View>

        <View style={styles.list}>
          {FEATURES.map((feature) => {
            const onFeaturePress = featurePress[feature.label];
            return (
              <Pressable
                key={feature.label}
                onPress={onFeaturePress}
                disabled={!onFeaturePress}
                accessibilityRole={onFeaturePress ? "button" : undefined}
                accessibilityLabel={feature.label}
                style={styles.row}
              >
                <View style={[styles.featureIcon, { backgroundColor: feature.bg }]}>
                  <SymbolView
                    name={{ ios: feature.ios, android: feature.android, web: feature.android }}
                    size={16}
                    tintColor={feature.tint}
                  />
                </View>
                <View style={styles.featureCopy}>
                  <Text style={styles.featureLabel}>{feature.label}</Text>
                  <Text style={styles.featureDetail}>{feature.detail}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={onStylePress}
          disabled={!onStylePress}
          accessibilityRole="button"
          accessibilityLabel="Get style suggestions"
          style={({ pressed }) => [styles.cta, pressed && onStylePress ? styles.ctaPressed : null]}
        >
          <SymbolView
            name={{ ios: "sparkles", android: "auto_awesome", web: "auto_awesome" }}
            size={14}
            tintColor={Brand.goldLight}
          />
          <Text style={styles.ctaText}>GET STYLE SUGGESTIONS</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 157, 0.1)",
    backgroundColor: Brand.white,
    paddingHorizontal: 18,
    paddingVertical: 20,
    shadowColor: Brand.maroon,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(184, 134, 11, 0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  headingCopy: {
    flex: 1,
  },
  title: {
    fontFamily: Brand.displayFont,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: Brand.maroon,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: "rgba(42, 42, 42, 0.55)",
  },
  list: {
    marginTop: 16,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 157, 0.08)",
    backgroundColor: "rgba(255, 245, 247, 0.45)",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureCopy: {
    flex: 1,
  },
  featureLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: Brand.maroon,
  },
  featureDetail: {
    marginTop: 2,
    fontSize: 13,
    color: "rgba(42, 42, 42, 0.55)",
  },
  cta: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: Brand.maroon,
    experimental_backgroundImage: "linear-gradient(90deg, #7B0D2B, #8f1230)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaPressed: {
    opacity: 0.9,
  },
  ctaText: {
    color: Brand.white,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
});
