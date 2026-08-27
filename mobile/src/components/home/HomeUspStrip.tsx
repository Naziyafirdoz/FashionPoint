import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SymbolView, type AndroidSymbol, type SFSymbol } from "expo-symbols";

import { Brand } from "@/constants/brand";

type UspItem = {
  title: string;
  lines: string[];
  ios: SFSymbol;
  android: AndroidSymbol;
};

const ITEMS: UspItem[] = [
  {
    title: "PREMIUM QUALITY",
    lines: ["Fine fabrics & finishing"],
    ios: "checkmark.shield.fill",
    android: "verified_user",
  },
  {
    title: "NO RETURNS",
    lines: ["No return", "No exchange", "No refund"],
    ios: "shippingbox",
    android: "block",
  },
  {
    title: "DESIGNER COLLECTIONS",
    lines: ["Curated for every occasion"],
    ios: "diamond.fill",
    android: "diamond",
  },
  {
    title: "100% SECURE PAYMENT",
    lines: ["Razorpay protected"],
    ios: "creditcard.fill",
    android: "credit_card",
  },
  {
    title: "AI STYLE ASSISTANT",
    lines: ["Smart recommendations"],
    ios: "sparkles",
    android: "smart_toy",
  },
];

const ITEM_GAP = 28;

function UspItems() {
  return (
    <>
      {ITEMS.map((item) => (
        <View key={item.title} style={styles.item}>
          <View style={styles.badge}>
            <SymbolView
              name={{ ios: item.ios, android: item.android, web: item.android }}
              size={18}
              tintColor={Brand.maroon}
            />
          </View>
          <Text style={styles.title} allowFontScaling={false} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.sub} allowFontScaling={false} numberOfLines={1}>
            {item.lines.join(" • ")}
          </Text>
        </View>
      ))}
    </>
  );
}

export function HomeUspStrip() {
  const translateX = useSharedValue(0);
  const loopWidth = useRef(0);

  useEffect(() => {
    return () => {
      cancelAnimation(translateX);
    };
  }, [translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const startMarquee = (width: number) => {
    const measured = Math.round(width);
    if (measured <= 0 || measured === loopWidth.current) return;

    loopWidth.current = measured;
    cancelAnimation(translateX);
    translateX.value = 0;
    translateX.value = withRepeat(
      withTiming(-measured, {
        duration: Math.max(22000, measured * 22),
        easing: Easing.linear,
      }),
      -1,
      false
    );
  };

  return (
    <View style={styles.section} accessibilityLabel="Store benefits">
      <View style={styles.viewport}>
        <Animated.View style={[styles.track, animatedStyle]}>
          <View
            collapsable={false}
            style={styles.copy}
            onLayout={(event) => startMarquee(event.nativeEvent.layout.width)}
          >
            <UspItems />
          </View>
          <View
            collapsable={false}
            style={styles.copy}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <UspItems />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 107, 157, 0.2)",
    backgroundColor: "#FFFCF8",
    paddingVertical: 14,
    overflow: "hidden",
  },
  viewport: {
    overflow: "hidden",
    justifyContent: "center",
  },
  track: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
  },
  copy: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    flexShrink: 0,
    gap: ITEM_GAP,
    paddingRight: ITEM_GAP,
  },
  item: {
    width: 168,
    alignItems: "center",
    flexShrink: 0,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(184, 134, 11, 0.75)",
    backgroundColor: "#FFFCF8",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Brand.gold,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: "800",
    color: Brand.maroon,
    textAlign: "center",
  },
  sub: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
    color: "rgba(42, 42, 42, 0.6)",
    textAlign: "center",
  },
});
