import { Suspense } from "react";
import { ProductsListing } from "@/components/store/ProductsListing";

export const metadata = { title: "Shop All Products" };

export default function ProductsPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center">Loading products…</p>}>
      <ProductsListing />
    </Suspense>
  );
}
