import { useCallback, useEffect, useRef, useState } from "react";
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
import { useRouter, type Href } from "expo-router";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";

import { CatalogProductCard } from "@/components/catalog/CatalogProductCard";
import { HomeAnnouncementBar } from "@/components/home/HomeAnnouncementBar";
import { HomeCollections } from "@/components/home/HomeCollections";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader";
import { HomeUspStrip } from "@/components/home/HomeUspStrip";
import { AppHeader } from "@/components/navigation/AppHeader";
import { Brand } from "@/constants/brand";
import { BottomTabInset, MaxContentWidth } from "@/constants/theme";
import {
  fetchHomeCatalog,
  type HomeCategory,
  type HomeProduct,
} from "@/lib/home-data";

const TRENDING_BG = require("@/assets/home/trending-now-bg.png");

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<HomeCategory[]>([]);
  const [products, setProducts] = useState<HomeProduct[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const collectionsOffsetY = useRef(0);

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

  const scrollToCollections = () => {
    scrollRef.current?.scrollTo({
      y: collectionsOffsetY.current,
      animated: true,
    });
  };

  const openCategory = (category: HomeCategory) => {
    router.push(`/category/${encodeURIComponent(category.slug)}` as Href);
  };

  const openStyle = () => router.push("/ai/style" as Href);
  const openSize = () => router.push("/ai/size" as Href);
  const openColor = () => router.push("/ai/color" as Href);

  const contentWidth = Math.min(width, MaxContentWidth);
  const cardWidth = (contentWidth - 32 - 12) / 2;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={[styles.frame, { maxWidth: MaxContentWidth }]}>
          <HomeAnnouncementBar />
          <AppHeader />

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
              ref={scrollRef}
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
              <HomeHero
                onShopPress={scrollToCollections}
                onStylePress={openStyle}
                onSizePress={openSize}
                onColorPress={openColor}
              />

              <View
                style={styles.collectionsBlock}
                onLayout={(event) => {
                  collectionsOffsetY.current = event.nativeEvent.layout.y;
                }}
              >
                <Image source={require("@/assets/home/explore-collections-bg.png")} style={StyleSheet.absoluteFill} contentFit="cover" />
                <HomeSectionHeader
                  dividerFirst
                  title="Explore Our Collections"
                  subtitle="Discover beautifully crafted ready-made blouse collections for every occasion."
                />
                <HomeCollections
                  categories={categories}
                  onCategoryPress={openCategory}
                />
              </View>

              <HomeUspStrip />

              <View style={styles.trendingBlock}>
                <Image source={TRENDING_BG} style={StyleSheet.absoluteFill} contentFit="cover" />
                <HomeSectionHeader title="Trending Now" />
                {products.length === 0 ? (
                  <Text style={styles.emptyText}>No products available.</Text>
                ) : (
                  <View style={styles.grid}>
                    {products.map((product) => (
                      <View key={product.id} style={{ width: cardWidth }}>
                        <CatalogProductCard product={product} />
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
    paddingBottom: BottomTabInset + 16,
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
  collectionsBlock: {
    position: "relative",
    overflow: "hidden",
    paddingTop: 28,
    paddingBottom: 12,
    backgroundColor: "#FFF8F5",
  },
  trendingBlock: {
    position: "relative",
    paddingTop: 28,
    paddingBottom: 32,
    overflow: "hidden",
  },
  emptyText: {
    marginTop: 16,
    paddingHorizontal: 20,
    fontSize: 14,
    color: Brand.muted,
    textAlign: "center",
  },
  grid: {
    marginTop: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
});
