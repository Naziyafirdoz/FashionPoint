import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { StackHeader } from "@/components/navigation/StackHeader";
import { PrimaryButton } from "@/components/ui/form";
import { Brand } from "@/constants/brand";
import { MaxContentWidth } from "@/constants/theme";
import { apiFetch, toUserMessage } from "@/lib/api";

const SAREE_COLORS = [
  { name: "Maroon", hex: "#7B0D2B" },
  { name: "Gold", hex: "#B8860B" },
  { name: "Red", hex: "#C41E3A" },
  { name: "Green", hex: "#1F7A4D" },
  { name: "Royal Blue", hex: "#1E4D8C" },
  { name: "Pink", hex: "#D46A92" },
  { name: "Cream", hex: "#F3E6C8" },
  { name: "Purple", hex: "#6B3FA0" },
  { name: "Black", hex: "#1A1A1A" },
  { name: "Orange", hex: "#E06B1F" },
];

type ColorRec = {
  name: string;
  slug: string;
  hex: string;
  matchPercent: number;
  matchType: string;
  reason: string;
  productCount: number;
};

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

export default function ColorMatchScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState(SAREE_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ColorRec[]>([]);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const rgb = hexToRgb(selected.hex);
      const data = await apiFetch<{ analysis?: { recommendations: ColorRec[] }; recommendations?: ColorRec[] }>(
        "/api/ai/color-matcher",
        {
          method: "POST",
          auth: "none",
          body: JSON.stringify({
            imageUrls: [`palette://${selected.name}`],
            detectedColors: [
              {
                hex: selected.hex,
                rgb,
                name: selected.name,
                percent: 100,
                role: "primary",
                displayLabel: selected.name,
                confidence: 95,
                uncertain: false,
              },
            ],
          }),
        }
      );
      setResults(data.analysis?.recommendations ?? data.recommendations ?? []);
    } catch (err) {
      setError(toUserMessage(err, "Color match is unavailable right now."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={[styles.frame, { maxWidth: MaxContentWidth }]}>
          <StackHeader title="Color Match" />
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.copy}>
              Choose your saree color. We use the website color matcher to recommend blouse colors.
            </Text>
            <View style={styles.swatches}>
              {SAREE_COLORS.map((color) => (
                <Pressable
                  key={color.name}
                  onPress={() => setSelected(color)}
                  style={[
                    styles.swatch,
                    { backgroundColor: color.hex },
                    selected.name === color.name ? styles.swatchActive : null,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.selected}>{selected.name}</Text>
            <PrimaryButton
              label={loading ? "Matching..." : "Find matching blouses"}
              onPress={() => void submit()}
              disabled={loading}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {results.map((rec) => (
              <Pressable
                key={rec.slug}
                onPress={() => router.push(`/shop?color=${encodeURIComponent(rec.slug)}` as Href)}
                style={styles.card}
              >
                <View style={[styles.dot, { backgroundColor: rec.hex }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{rec.name}</Text>
                  <Text style={styles.meta}>
                    {rec.matchType} · {rec.matchPercent}% · {rec.productCount} styles
                  </Text>
                  <Text style={styles.reason}>{rec.reason}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.ivory },
  safe: { flex: 1, alignItems: "center" },
  frame: { flex: 1, width: "100%" },
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  copy: { color: Brand.muted, lineHeight: 20 },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: "transparent" },
  swatchActive: { borderColor: Brand.maroon },
  selected: { fontWeight: "700", color: Brand.maroon },
  error: { color: "#9B1C1C" },
  card: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: Brand.white,
    padding: 12,
  },
  dot: { width: 28, height: 28, borderRadius: 14 },
  name: { fontWeight: "700", color: Brand.maroon },
  meta: { color: Brand.muted, fontSize: 12, marginTop: 2 },
  reason: { color: Brand.ink, marginTop: 4, fontSize: 13 },
});
