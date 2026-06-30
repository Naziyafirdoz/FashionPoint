import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/store/ProductDetail";
import { getProductBySlugFromDb } from "@/lib/products/get-by-slug";
import { getProductRecommendations } from "@/lib/products/get-product-recommendations";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlugFromDb(slug);
  if (!product) return { title: "Product Not Found" };
  return {
    title: product.seo_title ?? product.name,
    description: product.seo_description ?? product.short_description,
    openGraph: {
      title: product.seo_title ?? product.name,
      description: product.seo_description ?? product.short_description,
      images: product.images?.[0] ? [{ url: product.images[0] }] : []
    }
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlugFromDb(slug);
  if (!product) notFound();
  const recommendedProducts = await getProductRecommendations(product);
  return <ProductDetail product={product} recommendedProducts={recommendedProducts} />;
}
