import { Suspense } from "react";

import { CategoryHeroSection } from "@/components/store/CategoryHeroSection";

import { CategoryListing } from "@/components/store/CategoryListing";



export const metadata = { title: "Party Wear Blouses" };



export default function PartyWearPage() {

  return (

    <>

      <CategoryHeroSection
        title="Party Wear Blouses"
        description="Stand out in styles that sparkle."
      />

      <Suspense fallback={<p className="p-8 text-center">Loading…</p>}>

        <CategoryListing categorySlug="party-wear" />

      </Suspense>

    </>

  );

}

