import { useEffect, useRef } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SymbolView } from "expo-symbols";

import { Brand } from "@/constants/brand";

const ITEMS = [
  { key: "india", label: "Made in India", emoji: "🇮🇳" },
  { key: "premium", label: "Premium Ready-Made Blouses", symbol: "star.fill" as const, android: "star" as const },
  { key: "trusted", label: "Trusted by Our Early Customers", symbol: "person.2.fill" as const, android: "group" as const },
] as const;

const PHONE_DISPLAY = "+91 83409 73376";
const PHONE_TEL = "tel:+918340973376";
const ITEM_GAP = 28;

function AnnouncementItems() {
  return (
    <>
      {ITEMS.map((item) => (
        <View key={item.key} style={styles.item}>
          {"emoji" in item ? (
            <Text style={styles.flag} allowFontScaling={false}>
              {item.emoji}
            </Text>
          ) : (
            <SymbolView
              name={{ ios: item.symbol, android: item.android, web: item.android }}
              size={14}
              tintColor={Brand.goldLight}
            />
          )}
          <Text style={styles.label} allowFontScaling={false} numberOfLines={1}>
            {item.label}
          </Text>
        </View>
      ))}

      <Pressable
        onPress={() => void Linking.openURL(PHONE_TEL)}
        accessibilityRole="link"
        accessibilityLabel={`Call us at ${PHONE_DISPLAY}`}
        style={styles.item}
      >
        <SymbolView
          name={{ ios: "phone.fill", android: "phone", web: "phone" }}
          size={14}
          tintColor={Brand.goldLight}
        />
        <Text style={styles.label} allowFontScaling={false} numberOfLines={1}>
          {PHONE_DISPLAY}
        </Text>
      </Pressable>
    </>
  );
}

export function HomeAnnouncementBar() {
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
        duration: Math.max(16000, measured * 22),
        easing: Easing.linear,
      }),
      -1,
      false
    );
  };

  return (
    <View style={styles.bar} accessibilityRole="header" accessibilityLabel="Store highlights and support">
      <View style={styles.viewport}>
        <Animated.View style={[styles.track, animatedStyle]}>
          <View
            collapsable={false}
            style={styles.copy}
            onLayout={(event) => startMarquee(event.nativeEvent.layout.width)}
          >
            <AnnouncementItems />
          </View>
          <View
            collapsable={false}
            style={styles.copy}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <AnnouncementItems />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 40,
    justifyContent: "center",
    overflow: "hidden",
    experimental_backgroundImage: `linear-gradient(90deg, ${Brand.announcementStart}, ${Brand.maroon}, ${Brand.announcementEnd})`,
    backgroundColor: Brand.maroon,
  },
  viewport: {
    height: 40,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  flag: {
    fontSize: 13,
  },
  label: {
    color: Brand.white,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
