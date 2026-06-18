import { Suspense } from "react";
import { CategoryListing } from "@/components/store/CategoryListing";
import { CATEGORIES } from "@/lib/mock-data";

export const metadata = { title: "Designer Wear Blouses" };

export default function DesignerWearPage() {
  const cat = CATEGORIES.find((c) => c.slug === "designer-wear");
  return (
    <Suspense fallback={<p className="p-8 text-center">Loading…</p>}>
      <CategoryListing
        categorySlug="designer-wear"
        title="Designer Wear Blouses"
        subtitle="Exquisite designs for every celebration."
        heroImage={cat?.image_url}
      />
    </Suspense>
  );
}
