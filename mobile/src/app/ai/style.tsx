import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { CatalogProductCard } from "@/components/catalog/CatalogProductCard";
import { StackHeader } from "@/components/navigation/StackHeader";
import { PrimaryButton } from "@/components/ui/form";
import { Brand } from "@/constants/brand";
import { MaxContentWidth } from "@/constants/theme";
import { apiFetch, toUserMessage } from "@/lib/api";
import { productToCard, type CatalogProduct } from "@/lib/catalog";

const OCCASIONS = ["Wedding", "Daily", "Party", "Festive", "Office"];
const STYLES = ["Elegant", "Traditional", "Modern", "Casual"];
const NECKS = ["Boat", "V-Neck", "Round"];
const SLEEVES = ["Half", "Sleeveless", "Short"];

type Recommendation = {
  product: CatalogProduct;
  matchPercent: number;
  reason: string;
};

export default function StyleAssistantScreen() {
  const router = useRouter();
  const [occasion, setOccasion] = useState("Wedding");
  const [stylePreference, setStylePreference] = useState("Elegant");
  const [neckStyle, setNeckStyle] = useState("Boat");
  const [sleeveStyle, setSleeveStyle] = useState("Half");
  const [budget, setBudget] = useState(3000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Recommendation[]>([]);
  const [searched, setSearched] = useState(false);

  const submit = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const data = await apiFetch<{
        recommendations: Array<{ productId: string; matchPercent: number; reason: string }>;
        products: CatalogProduct[];
      }>("/api/ai/style-chat", {
        method: "POST",
        auth: "none",
        body: JSON.stringify({ occasion, stylePreference, neckStyle, sleeveStyle, budget }),
      });
      const byId = new Map((data.products ?? []).map((product) => [product.id, product]));
      setResults(
        (data.recommendations ?? []).flatMap((rec) => {
          const product = byId.get(rec.productId);
          if (!product) return [];
          return [{ product, matchPercent: rec.matchPercent, reason: rec.reason }];
        })
      );
      setError(null);
    } catch (err) {
      setError(toUserMessage(err, "Style suggestions are unavailable right now."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={[styles.frame, { maxWidth: MaxContentWidth }]}>
          <StackHeader title="Style Assistant" />
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.copy}>
              Tell us the occasion, taste, and budget. We will use the same style recommender as the website.
            </Text>
            <OptionRow label="Occasion" value={occasion} options={OCCASIONS} onChange={setOccasion} />
            <OptionRow label="Style" value={stylePreference} options={STYLES} onChange={setStylePreference} />
            <OptionRow label="Neck" value={neckStyle} options={NECKS} onChange={setNeckStyle} />
            <OptionRow label="Sleeve" value={sleeveStyle} options={SLEEVES} onChange={setSleeveStyle} />
            <View style={styles.budgetRow}>
              <Text style={styles.label}>Budget</Text>
              <View style={styles.budgetBtns}>
                {[1500, 2500, 3000, 4000, 5000].map((amount) => (
                  <Pressable
                    key={amount}
                    onPress={() => setBudget(amount)}
                    style={[styles.chip, budget === amount ? styles.chipActive : null]}
                  >
                    <Text style={[styles.chipText, budget === amount ? styles.chipTextActive : null]}>
                      ₹{amount}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <PrimaryButton
              label={loading ? "Finding styles..." : "Get style suggestions"}
              onPress={() => void submit()}
              disabled={loading}
            />
            {loading ? <ActivityIndicator color={Brand.maroon} /> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {searched && !loading && results.length === 0 && !error ? (
              <Text style={styles.empty}>No matching blouses for these preferences yet.</Text>
            ) : null}
            {results.map((result) => (
              <View key={result.product.id} style={styles.result}>
                <Text style={styles.match}>{result.matchPercent}% match · {result.reason}</Text>
                <CatalogProductCard product={productToCard(result.product)} />
              </View>
            ))}
            <Pressable onPress={() => router.push("/ai/size" as Href)}>
              <Text style={styles.link}>Need a size? Open Size Finder</Text>
            </Pressable>
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

function OptionRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {options.map((option) => (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[styles.chip, value === option ? styles.chipActive : null]}
          >
            <Text style={[styles.chipText, value === option ? styles.chipTextActive : null]}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.ivory },
  safe: { flex: 1, alignItems: "center" },
  frame: { flex: 1, width: "100%" },
  body: { padding: 16, paddingBottom: 40, gap: 14 },
  copy: { color: Brand.muted, lineHeight: 20 },
  block: { gap: 8 },
  label: { fontWeight: "700", color: Brand.maroon },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Brand.white,
  },
  chipActive: { backgroundColor: Brand.maroon, borderColor: Brand.maroon },
  chipText: { color: Brand.maroon, fontWeight: "700" },
  chipTextActive: { color: Brand.white },
  budgetRow: { gap: 8 },
  budgetBtns: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  error: { color: "#9B1C1C" },
  empty: { color: Brand.muted, textAlign: "center" },
  result: { gap: 8 },
  match: { color: Brand.gold, fontWeight: "700" },
  link: { textAlign: "center", color: Brand.maroon, fontWeight: "700" },
});
