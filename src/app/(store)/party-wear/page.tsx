import { Suspense } from "react";
import { CategoryListing } from "@/components/store/CategoryListing";
import { CATEGORIES } from "@/lib/mock-data";

export const metadata = { title: "Party Wear Blouses" };

export default function PartyWearPage() {
  const cat = CATEGORIES.find((c) => c.slug === "party-wear");
  return (
    <Suspense fallback={<p className="p-8 text-center">Loading…</p>}>
      <CategoryListing
        categorySlug="party-wear"
        title="Party Wear Blouses"
        subtitle="Stand out in styles that sparkle."
        heroImage={cat?.image_url}
      />
    </Suspense>
  );
}
