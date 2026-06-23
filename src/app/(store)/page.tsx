import { HeroBanner } from "@/components/store/HeroBanner";
import { CategoryCards } from "@/components/store/CategoryCards";
import { UspStrip } from "@/components/store/UspStrip";
import { TrendingProducts } from "@/components/store/TrendingProducts";
import { getTrendingProducts } from "@/lib/products/get-trending";

export default async function HomePage() {
  const trendingProducts = await getTrendingProducts();

  return (
    <>
      <HeroBanner />
      <CategoryCards />
      <UspStrip />
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-primary">Trending Now</h2>
        <TrendingProducts products={trendingProducts} />
      </section>
    </>
  );
}
