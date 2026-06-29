import { Suspense } from "react";

import { CategoryHeroSection } from "@/components/store/CategoryHeroSection";

import { CategoryListing } from "@/components/store/CategoryListing";



export const metadata = { title: "Daily Wear Blouses" };



export default function DailyWearPage() {

  return (

    <>

      <CategoryHeroSection

        title="Daily Wear Blouses"

        description="Comfortable styles for everyday elegance."

      />

      <Suspense fallback={<p className="p-8 text-center">Loading…</p>}>

        <CategoryListing categorySlug="daily-wear" />

      </Suspense>

    </>

  );

}

