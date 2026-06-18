import { Suspense } from "react";
import { CategoryListing } from "@/components/store/CategoryListing";
import { CATEGORIES } from "@/lib/mock-data";

export const metadata = { title: "Daily Wear Blouses" };

export default function DailyWearPage() {
  const cat = CATEGORIES.find((c) => c.slug === "daily-wear");
  return (
    <Suspense fallback={<p className="p-8 text-center">Loading…</p>}>
      <CategoryListing
        categorySlug="daily-wear"
        title="Daily Wear Blouses"
        subtitle="Comfortable styles for everyday elegance."
        heroImage={cat?.image_url}
      />
    </Suspense>
  );
}
