import { ProductGrid } from "@/components/store/ProductGrid";
import { MOCK_PRODUCTS } from "@/lib/mock-data";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.toLowerCase() ?? "";
  const products = MOCK_PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(query) ||
      p.fabric?.toLowerCase().includes(query) ||
      p.colors?.some((c) => c.toLowerCase().includes(query)) ||
      p.sku?.toLowerCase().includes(query)
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-primary">
        Search: {q || "All"}
      </h1>
      <ProductGrid products={products} />
    </div>
  );
}
