import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CatalogProductCard } from "@/components/catalog/CatalogProductCard";
import { StackHeader } from "@/components/navigation/StackHeader";
import { StatusMessage } from "@/components/ui/form";
import { Brand } from "@/constants/brand";
import { MaxContentWidth } from "@/constants/theme";
import { toUserMessage } from "@/lib/api";
import { productToCard, searchProducts, searchSuggestions } from "@/lib/catalog";

export default function SearchScreen() {
  const { width } = useWindowDimensions();
  const cardWidth = (Math.min(width, MaxContentWidth) - 32 - 12) / 2;
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [products, setProducts] = useState<ReturnType<typeof productToCard>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      void searchSuggestions(trimmed)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const runSearch = useCallback(async (value: string) => {
    const trimmed = value.trim();
    setQuery(trimmed);
    setSearched(true);
    if (!trimmed) {
      setProducts([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    try {
      const result = await searchProducts(trimmed);
      setProducts(result.products.map(productToCard));
      setTotal(result.total);
      setError(null);
    } catch (err) {
      setError(toUserMessage(err, "Search is unavailable right now."));
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={[styles.frame, { maxWidth: MaxContentWidth }]}>
          <StackHeader title="Search" />
          <View style={styles.searchBar}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search blouses, fabrics, occasions"
              placeholderTextColor={Brand.muted}
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={() => void runSearch(query)}
              style={styles.input}
            />
            <Pressable onPress={() => void runSearch(query)} style={styles.searchBtn}>
              <Text style={styles.searchBtnText}>Search</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {suggestions.length > 0 && !searched ? (
              <View style={styles.suggestions}>
                {suggestions.map((item) => (
                  <Pressable key={item} onPress={() => void runSearch(item)} style={styles.suggestion}>
                    <Text style={styles.suggestionText}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {loading ? (
              <ActivityIndicator color={Brand.maroon} style={{ marginTop: 32 }} />
            ) : error ? (
              <StatusMessage title="Search failed" message={error} actionLabel="Try again" onAction={() => void runSearch(query)} />
            ) : searched && products.length === 0 ? (
              <StatusMessage
                title="No matches"
                message="Try a different blouse name, color, or occasion."
              />
            ) : (
              <>
                {searched ? <Text style={styles.count}>{total} results</Text> : null}
                <View style={styles.grid}>
                  {products.map((product) => (
                    <View key={product.id} style={{ width: cardWidth }}>
                      <CatalogProductCard product={product} />
                    </View>
                  ))}
                </View>
              </>
            )}
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
  searchBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    minHeight: 46,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: Brand.white,
    paddingHorizontal: 16,
    color: Brand.ink,
  },
  searchBtn: {
    borderRadius: 999,
    backgroundColor: Brand.maroon,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  searchBtnText: { color: Brand.white, fontWeight: "700" },
  body: { paddingBottom: 32 },
  suggestions: { paddingHorizontal: 16, gap: 6 },
  suggestion: {
    borderRadius: 12,
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  suggestionText: { color: Brand.ink },
  count: { paddingHorizontal: 16, paddingBottom: 8, color: Brand.muted },
  grid: {
    paddingHorizontal: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
});
