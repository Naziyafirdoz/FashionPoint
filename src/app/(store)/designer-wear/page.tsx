import { Suspense } from "react";
import { CategoryHeroSection } from "@/components/store/CategoryHeroSection";
import { CategoryListing } from "@/components/store/CategoryListing";

export const metadata = { title: "Designer Wear Blouses" };

export default function DesignerWearPage() {
  return (
    <>
      <CategoryHeroSection
        title="Designer Wear Blouses"
        description="Exquisite designs for every celebration."
      />
      <Suspense fallback={<p className="p-8 text-center">Loading…</p>}>
        <CategoryListing
          categorySlug="designer-wear"
          title="Designer Wear Blouses"
          subtitle="Exquisite designs for every celebration."
          hideHero
        />
      </Suspense>
    </>
  );
}
