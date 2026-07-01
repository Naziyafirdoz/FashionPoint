"use client";

import Link from "next/link";
import { ProductImage } from "@/components/store/ProductImage";
import type { CategoryMegaMenuCategory } from "@/components/store/category-mega-menu/types";

type CategoryImageCardProps = {
  category: CategoryMegaMenuCategory;
  compact?: boolean;
};

export function CategoryImageCard({ category, compact = false }: CategoryImageCardProps) {
  const bannerUrl =
    category.banner_image_url?.trim() || category.image_url?.trim() || null;

  return (
    <Link
      href={category.href}
      className={`group relative block w-full overflow-hidden rounded-[18px] border border-[#F2E4E8] bg-blush shadow-[0_4px_16px_rgba(123,13,43,0.06)] transition-shadow duration-200 ease-out hover:shadow-[0_8px_24px_rgba(123,13,43,0.1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        compact ? "h-[220px]" : "h-[230px]"
      }`}
      aria-label={`View ${category.name} collection`}
    >
      {bannerUrl ? (
        <div className="absolute inset-0">
          <ProductImage
            src={bannerUrl}
            alt={`${category.name} collection banner`}
            className="object-cover object-center transition-transform duration-200 ease-out group-hover:scale-[1.02]"
            sizes={compact ? "(max-width: 1280px) 260px, 400px" : "400px"}
          />
        </div>
      ) : (
        <div
          className="absolute inset-0 bg-gradient-to-br from-blush via-white to-accent/10"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}
