import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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

import { CatalogProductCard } from "@/components/catalog/CatalogProductCard";
import { StatusMessage } from "@/components/ui/form";
import { Brand } from "@/constants/brand";
import { toUserMessage } from "@/lib/api";
import {
  fetchCategories,
  fetchProductList,
  productToCard,
  PRODUCT_SORT_OPTIONS,
  type CatalogCategory,
  type FacetGroup,
  type ProductListQuery,
} from "@/lib/catalog";

type ShopCatalogProps = {
  categorySlug?: string | null;
  color?: string | null;
  size?: string | null;
  header?: ReactNode;
  paddingBottom?: number;
};

export function ShopCatalog({
  categorySlug,
  color,
  size,
  header,
  paddingBottom = 24,
}: ShopCatalogProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cardWidth = (Math.min(width, 800) - 32 - 12) / 2;
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [sort, setSort] = useState("latest");
  const [selectedSize, setSelectedSize] = useState(size ?? "");
  const [selectedColor, setSelectedColor] = useState(color ?? "");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const [products, setProducts] = useState<ReturnType<typeof productToCard>[]>([]);
  const [facets, setFacets] = useState<FacetGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSize(size ?? "");
    setSelectedColor(color ?? "");
  }, [size, color]);

  const query = useMemo<ProductListQuery>(
    () => ({
      category: categorySlug || undefined,
      size: selectedSize || undefined,
      color: selectedColor || undefined,
      sort,
      limit: 12,
    }),
    [categorySlug, selectedColor, selectedSize, sort]
  );

  const load = useCallback(
    async (mode: "replace" | "more" | "refresh" = "replace") => {
      const nextPage = mode === "more" ? page + 1 : 1;
      if (mode === "more") setLoadingMore(true);
      else if (mode === "refresh") setRefreshing(true);
      else setLoading(true);

      try {
        const [list, cats] = await Promise.all([
          fetchProductList({ ...query, page: nextPage }),
          categories.length > 0 ? Promise.resolve(categories) : fetchCategories(),
        ]);
        const cards = list.products.map(productToCard);
        setProducts((current) => (mode === "more" ? [...current, ...cards] : cards));
        setTotal(list.total);
        setPageSize(list.pageSize);
        setPage(list.page);
        setFacets(list.facets?.groups ?? []);
        if (categories.length === 0) setCategories(cats);
        setError(null);
      } catch (err) {
        setError(toUserMessage(err, "Unable to load products."));
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [categories, page, query]
  );

  useEffect(() => {
    void load("replace");
    // query identity is the filter set; page is handled inside load("more")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySlug, selectedColor, selectedSize, sort]);

  const openCategory = (slug?: string) => {
    if (!slug) {
      router.replace("/shop" as Href);
      return;
    }
    router.push(`/category/${encodeURIComponent(slug)}` as Href);
  };

  const sizeFacet = facets.find((group) => group.key === "size");
  const colorFacet = facets.find((group) => group.key === "color");
  const hasMore = products.length < total;
  const title = categories.find((category) => category.slug === categorySlug)?.name ?? "Shop";

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load("refresh")}
          tintColor={Brand.maroon}
          colors={[Brand.maroon]}
        />
      }
    >
      {header}
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>Boutique</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.count}>{total} styles</Text>
      </View>

      <ChipRow>
        <FilterChip label="All" active={!categorySlug} onPress={() => openCategory()} />
        {categories.map((category) => (
          <FilterChip
            key={category.id}
            label={category.name}
            active={category.slug === categorySlug}
            onPress={() => openCategory(category.slug)}
          />
        ))}
      </ChipRow>

      <ChipRow>
        {PRODUCT_SORT_OPTIONS.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            active={sort === option.value}
            onPress={() => setSort(option.value)}
          />
        ))}
      </ChipRow>

      {sizeFacet?.options?.length ? (
        <ChipRow>
          <FilterChip label="Any size" active={!selectedSize} onPress={() => setSelectedSize("")} />
          {sizeFacet.options.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              active={selectedSize === option.value}
              onPress={() => setSelectedSize(option.value === selectedSize ? "" : option.value)}
            />
          ))}
        </ChipRow>
      ) : null}

      {colorFacet?.options?.length ? (
        <ChipRow>
          <FilterChip label="Any color" active={!selectedColor} onPress={() => setSelectedColor("")} />
          {colorFacet.options.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              active={selectedColor === option.value}
              onPress={() => setSelectedColor(option.value === selectedColor ? "" : option.value)}
            />
          ))}
        </ChipRow>
      ) : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Brand.maroon} />
          <Text style={styles.status}>Loading the collection…</Text>
        </View>
      ) : error ? (
        <StatusMessage
          title="Unable to load shop"
          message={error}
          actionLabel="Try again"
          onAction={() => void load("replace")}
        />
      ) : products.length === 0 ? (
        <StatusMessage title="No blouses found" message="Try another collection, size, or color." />
      ) : (
        <View style={styles.grid}>
          {products.map((product) => (
            <View key={product.id} style={{ width: cardWidth }}>
              <CatalogProductCard product={product} />
            </View>
          ))}
        </View>
      )}

      {hasMore && !loading ? (
        <View style={styles.moreWrap}>
          <Pressable
            onPress={() => void load("more")}
            disabled={loadingMore}
            style={({ pressed }) => [styles.more, pressed ? styles.pressed : null]}
          >
            <Text style={styles.moreText}>
              {loadingMore ? "Loading…" : `Load more (${Math.min(pageSize, total - products.length)} more)`}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {children}
    </ScrollView>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active ? styles.chipActive : null]}>
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heading: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: Brand.gold,
  },
  title: {
    marginTop: 4,
    fontFamily: Brand.displayFont,
    fontSize: 28,
    color: Brand.maroon,
  },
  count: {
    marginTop: 4,
    fontSize: 13,
    color: Brand.muted,
  },
  chips: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: Brand.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: Brand.maroon,
    borderColor: Brand.maroon,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: Brand.maroon,
  },
  chipTextActive: {
    color: Brand.white,
  },
  grid: {
    paddingHorizontal: 16,
    paddingTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  centered: {
    paddingVertical: 48,
    alignItems: "center",
    gap: 10,
  },
  status: {
    color: Brand.muted,
    fontSize: 14,
  },
  moreWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  more: {
    minHeight: 46,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Brand.maroon,
    alignItems: "center",
    justifyContent: "center",
  },
  moreText: {
    color: Brand.maroon,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.85,
  },
});
