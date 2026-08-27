import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { HomeAiAssistant } from "@/components/home/HomeAiAssistant";
import { Brand } from "@/constants/brand";

const HERO_BG = require("@/assets/home/original-bg.png");
const GOLD_FRAME = require("@/assets/home/gold-circle-frame.png");
const MODEL = require("@/assets/home/hero-model.png");
const FLORAL_LEFT = require("@/assets/home/floral-left.png");
const FLORAL_RIGHT = require("@/assets/home/floral-right.png");

const FEATURES = ["Ready-made", "Premium Quality", "Perfect Fit", "Comfortable All Day"];
const AVATAR_COLORS = ["#f5c4d4", "#e8b4c8", "#d4a5b9", "#c995aa", "#f0d0dc"];

/** Website HeroBanner canvas: aspect-[4/6.25]. Florals use the desktop ratio (19rem / 26rem). */
const STAGE_WIDTH = 320;
const STAGE_HEIGHT = 500;
const WRAP_SCALE = 1.22;
const FLORAL_WIDTH = 19 / 26;
const FLORAL_LEFT_INSET = -0.06;
const FLORAL_RIGHT_INSET = -0.08;
const FLORAL_RIGHT_BOTTOM = 0.02;
const MODEL_SHIFT = 16 / STAGE_WIDTH;
const MODEL_HEIGHT_SCALE = 1.2;
const BADGE_TOP = (STAGE_HEIGHT * 0.24 - 20) / STAGE_HEIGHT;
const BADGE_WIDTH = 108 / STAGE_WIDTH;
const BADGE_HEIGHT = 34 / STAGE_HEIGHT;

type HomeHeroProps = {
  onShopPress: () => void;
  onStylePress: () => void;
  onSizePress: () => void;
  onColorPress: () => void;
};

export function HomeHero({
  onShopPress,
  onStylePress,
  onSizePress,
  onColorPress,
}: HomeHeroProps) {
  const { width } = useWindowDimensions();
  const stageW = Math.round(Math.min(width / 1.4, STAGE_WIDTH));
  const stageH = Math.round((stageW * STAGE_HEIGHT) / STAGE_WIDTH);
  const scale = stageW / STAGE_WIDTH;
  const wrap = Math.round(stageW * WRAP_SCALE);
  const wrapLeft = (stageW - wrap) / 2;
  const wrapTop = stageH * 0.4 - wrap / 2;
  const floralW = stageW * FLORAL_WIDTH;
  const floralLeftH = floralW * (561 / 445);
  const floralRightH = floralW * (467 / 535);

  return (
    <View style={styles.section}>
      <Image source={HERO_BG} style={StyleSheet.absoluteFill} contentFit="cover" />

      <View style={styles.artwork}>
        <View style={[styles.composition, { width: stageW, height: stageH }]}>
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: wrapLeft,
              top: wrapTop,
              width: wrap,
              height: wrap,
              zIndex: 1,
            }}
          >
            <View
              style={{
                position: "absolute",
                left: wrap * 0.04,
                top: wrap * 0.04,
                width: wrap * 0.92,
                height: wrap * 0.92,
                borderRadius: wrap * 0.46,
                backgroundColor: "rgba(255, 160, 190, 0.18)",
              }}
            />
            <Image
              source={GOLD_FRAME}
              style={{ width: wrap, height: wrap }}
              contentFit="contain"
            />
            <View
              style={{
                position: "absolute",
                left: "12%",
                top: "12%",
                width: "76%",
                height: "76%",
                borderRadius: 9999,
                backgroundColor: "rgba(255, 255, 255, 0.08)",
              }}
            />
            <Image
              source={FLORAL_LEFT}
              style={{
                position: "absolute",
                left: wrap * FLORAL_LEFT_INSET,
                bottom: 0,
                width: floralW,
                height: floralLeftH,
              }}
              contentFit="contain"
            />
            <Image
              source={FLORAL_RIGHT}
              style={{
                position: "absolute",
                right: wrap * FLORAL_RIGHT_INSET,
                bottom: wrap * FLORAL_RIGHT_BOTTOM,
                width: floralW,
                height: floralRightH,
              }}
              contentFit="contain"
            />
          </View>

          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: wrapLeft,
              top: stageW * MODEL_SHIFT,
              width: wrap,
              height: stageH,
              zIndex: 2,
            }}
          >
            <Image
              source={MODEL}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                width: wrap,
                height: stageH * MODEL_HEIGHT_SCALE,
              }}
              contentFit="contain"
              contentPosition={{ left: "47%", bottom: 0 }}
            />
          </View>

          <Pressable
            onPress={onStylePress}
            accessibilityRole="button"
            accessibilityLabel="Get AI style suggestions"
            style={[
              styles.aiBadge,
              {
                top: stageH * BADGE_TOP,
                left: wrapLeft + wrap * 0.82 - 20,
                width: stageW * BADGE_WIDTH,
                height: stageH * BADGE_HEIGHT,
                paddingHorizontal: 8 * scale,
                gap: 4 * scale,
              },
            ]}
          >
            <SymbolView
              name={{ ios: "sparkles", android: "auto_awesome", web: "auto_awesome" }}
              size={Math.max(10, Math.round(11 * scale))}
              tintColor={Brand.goldLight}
            />
            <View>
              <Text style={[styles.aiBadgeTitle, { fontSize: Math.max(8, 8 * scale), letterSpacing: 1 }]}>AI STYLE</Text>
              <Text style={[styles.aiBadgeSub, { fontSize: Math.max(7, 7.5 * scale), letterSpacing: 0.8 }]}>SUGGESTION</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <View style={styles.copy}>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowLine} />
          <Text style={styles.eyebrow}>Premium Ready-Made Indian Blouses</Text>
        </View>

        <Text style={styles.title}>
          Style <Text style={styles.ampersand}>&</Text>
          {"\n"}Confidence
        </Text>

        <View style={styles.subtitleRow}>
          <Text style={styles.spark}>✦</Text>
          <Text style={styles.subtitle}>
            For Every Occasion — crafted for the modern Indian woman
          </Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((feature) => (
            <View key={feature} style={styles.feature}>
              <View style={styles.check}>
                <SymbolView
                  name={{ ios: "checkmark", android: "check", web: "check" }}
                  size={11}
                  tintColor={Brand.gold}
                />
              </View>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={onShopPress}
          accessibilityRole="button"
          accessibilityLabel="Shop ready-made blouses"
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <Text style={styles.ctaText}>SHOP READY-MADE BLOUSES</Text>
          <View style={styles.ctaArrow}>
            <SymbolView
              name={{ ios: "arrow.right", android: "arrow_forward", web: "arrow_forward" }}
              size={14}
              tintColor={Brand.white}
            />
          </View>
        </Pressable>

        <View style={styles.socialProof}>
          <View style={styles.proofRow}>
            <Text style={styles.proofText}>Newly Launched with 1K+ Happy Customers</Text>
            <View style={styles.stars} accessibilityLabel="5 out of 5 stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <SymbolView
                  key={star}
                  name={{ ios: "star.fill", android: "star", web: "star" }}
                  size={12}
                  tintColor={Brand.gold}
                />
              ))}
            </View>
          </View>
          <View style={styles.avatars}>
            {AVATAR_COLORS.map((color, index) => (
              <View
                key={color}
                style={[
                  styles.avatar,
                  { backgroundColor: color, marginLeft: index === 0 ? 0 : -8, zIndex: 5 - index },
                ]}
              >
                <Text style={styles.avatarLetter}>{String.fromCharCode(65 + index)}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <HomeAiAssistant
        onStylePress={onStylePress}
        onSizePress={onSizePress}
        onColorPress={onColorPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: "#FFF8F5",
  },
  artwork: {
    width: "100%",
    alignItems: "center",
    overflow: "visible",
    paddingTop: 12,
    paddingBottom: 28,
  },
  composition: {
    alignSelf: "center",
    overflow: "visible",
  },
  aiBadge: {
    position: "absolute",
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: "rgba(92, 10, 32, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(201, 128, 148, 0.42)",
    overflow: "hidden",
  },
  aiBadgeTitle: {
    color: Brand.goldLight,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  aiBadgeSub: {
    color: Brand.white,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  copy: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 8,
    alignItems: "center",
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eyebrowLine: {
    width: 22,
    height: 1,
    backgroundColor: "rgba(184, 134, 11, 0.7)",
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: "rgba(123, 13, 43, 0.75)",
  },
  title: {
    marginTop: 12,
    fontFamily: Brand.displayFont,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: "700",
    color: Brand.maroon,
    textAlign: "center",
  },
  ampersand: {
    fontFamily: Brand.displayFont,
    fontStyle: "italic",
    color: Brand.gold,
  },
  subtitleRow: {
    marginTop: 12,
    maxWidth: 280,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  spark: {
    color: Brand.gold,
    fontSize: 12,
    marginTop: 2,
  },
  subtitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(42, 42, 42, 0.65)",
    textAlign: "center",
  },
  features: {
    marginTop: 18,
    width: "100%",
    maxWidth: 340,
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 10,
  },
  feature: {
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(184, 134, 11, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    color: "rgba(42, 42, 42, 0.8)",
  },
  cta: {
    marginTop: 22,
    minHeight: 52,
    borderRadius: 999,
    paddingLeft: 22,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Brand.maroon,
    experimental_backgroundImage: "linear-gradient(90deg, #7B0D2B, #8f1230, #7B0D2B)",
    shadowColor: Brand.maroon,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
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
  ctaArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  socialProof: {
    marginTop: 16,
    alignItems: "center",
    gap: 10,
  },
  proofRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  proofText: {
    fontSize: 12,
    color: "rgba(42, 42, 42, 0.65)",
  },
  stars: {
    flexDirection: "row",
    gap: 1,
  },
  avatars: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Brand.white,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(123, 13, 43, 0.7)",
  },
});
