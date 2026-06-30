import { ProductGrid } from "@/components/store/ProductGrid";
import { createServiceClient } from "@/lib/supabase";
import { searchProducts } from "@/lib/search/search-products";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const db = createServiceClient();
  const result =
    query && db
      ? await searchProducts(db, { query, page: 1, limit: 48 })
      : { products: [], total: 0, page: 1, pageSize: 48 };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-primary">
        Search: {q || "All"}
      </h1>
      {query && result.total === 0 ? (
        <p className="mt-4 text-sm text-[#666666]">
          No products found for &ldquo;{query}&rdquo;. Try another color, fabric, or occasion.
        </p>
      ) : null}
      <ProductGrid products={result.products} layout="listing" />
    </div>
  );
}
