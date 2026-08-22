import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { HomeHeader } from "@/components/home/HomeHeader";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeProductCard } from "@/components/home/HomeProductCard";
import { Brand } from "@/constants/brand";
import { BottomTabInset, MaxContentWidth } from "@/constants/theme";
import {
  fetchHomeCatalog,
  type HomeCategory,
  type HomeProduct,
} from "@/lib/home-data";

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<HomeCategory[]>([]);
  const [products, setProducts] = useState<HomeProduct[]>([]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const catalog = await fetchHomeCatalog();
      setCategories(catalog.categories);
      setProducts(catalog.products);
      setError(null);
    } catch {
      setError("We could not load the boutique right now. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openExplore = () => {
    router.push("/explore");
  };

  const contentWidth = Math.min(width, MaxContentWidth);
  const cardWidth = (contentWidth - 40 - 12) / 2;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={[styles.frame, { maxWidth: MaxContentWidth }]}>
          <HomeHeader onSearchPress={openExplore} />

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={Brand.maroon} />
              <Text style={styles.statusText}>Opening the boutique…</Text>
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <Text style={styles.statusTitle}>Something went wrong</Text>
              <Text style={styles.statusText}>{error}</Text>
              <Pressable onPress={() => void load()} style={styles.retry}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => void load(true)}
                  tintColor={Brand.maroon}
                  colors={[Brand.maroon]}
                />
              }
            >
              <HomeHero onShopPress={openExplore} />

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Collections</Text>
                {categories.length === 0 ? (
                  <Text style={styles.emptyText}>Collections will appear here soon.</Text>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryRow}
                  >
                    {categories.map((category) => (
                      <Pressable
                        key={category.id}
                        onPress={openExplore}
                        style={styles.categoryChip}
                      >
                        <Text style={styles.categoryText}>{category.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Trending now</Text>
                {products.length === 0 ? (
                  <Text style={styles.emptyText}>New blouses are being added to the boutique.</Text>
                ) : (
                  <View style={styles.grid}>
                    {products.map((product) => (
                      <View key={product.id} style={{ width: cardWidth }}>
                        <HomeProductCard product={product} />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.ivory,
  },
  safe: {
    flex: 1,
    alignItems: "center",
  },
  frame: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    paddingBottom: BottomTabInset + 24,
    gap: 8,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  statusTitle: {
    fontFamily: Brand.displayFont,
    fontSize: 22,
    color: Brand.maroon,
    textAlign: "center",
  },
  statusText: {
    fontSize: 14,
    lineHeight: 20,
    color: Brand.muted,
    textAlign: "center",
  },
  retry: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: Brand.maroon,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: {
    color: Brand.white,
    fontWeight: "700",
    fontSize: 13,
  },
  section: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontFamily: Brand.displayFont,
    fontSize: 22,
    color: Brand.maroon,
    marginBottom: 14,
  },
  emptyText: {
    fontSize: 14,
    color: Brand.muted,
    lineHeight: 20,
  },
  categoryRow: {
    gap: 8,
    paddingRight: 8,
  },
  categoryChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: Brand.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  categoryText: {
    color: Brand.maroon,
    fontSize: 13,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
});
