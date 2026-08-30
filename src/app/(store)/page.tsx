import Image from "next/image";
import { ExploreCollectionsScrollHandler } from "@/components/store/ExploreCollectionsScrollHandler";
import { HomeHeroSlot } from "@/components/store/HomeHeroSlot";
import { CategoryCards } from "@/components/store/CategoryCards";
import { UspStrip } from "@/components/store/UspStrip";
import { TrendingNowSectionBackground } from "@/components/store/TrendingNowSectionBackground";
import { TrendingProducts } from "@/components/store/TrendingProducts";
import { getTrendingProducts } from "@/lib/products/get-trending";

const EXPLORE_COLLECTIONS_DIVIDER = "/assets/hero/explore-collections-divider.png";

export default async function HomePage() {
  const trendingProducts = await getTrendingProducts();

  return (
    <>
      <ExploreCollectionsScrollHandler />
      <HomeHeroSlot />
      <CategoryCards />
      <UspStrip />
      <section className="relative w-full overflow-hidden py-12">
        <TrendingNowSectionBackground />
        <div className="relative z-10 mx-auto max-w-7xl px-4">
          <header className="text-center">
            <h2 className="font-display text-2xl font-bold text-primary">Trending Now</h2>
            <Image
              src={EXPLORE_COLLECTIONS_DIVIDER}
              alt=""
              width={267}
              height={40}
              aria-hidden
              sizes="267px"
              className="mx-auto mt-2.5 block h-auto w-auto max-w-[min(100%,267px)]"
            />
          </header>
          <TrendingProducts products={trendingProducts} />
        </div>
      </section>
    </>
  );
}
