"use client";

import Link from "next/link";
import { ProductImage } from "@/components/store/ProductImage";
import type { CategoryMegaMenuCategory } from "@/components/store/category-mega-menu/types";

type CategoryImageCardProps = {
  category: CategoryMegaMenuCategory;
  compact?: boolean;
};

export function CategoryImageCard({ category, compact = false }: CategoryImageCardProps) {
  return (
    <div className={compact ? "w-40 shrink-0" : "w-44 shrink-0 xl:w-48"}>
      {category.image_url ? (
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-accent/10 bg-blush">
          <ProductImage
            src={category.image_url}
            alt={category.name}
            className="object-cover"
            sizes={compact ? "160px" : "192px"}
          />
        </div>
      ) : (
        <div className="aspect-[3/4] rounded-lg border border-accent/10 bg-gradient-to-br from-blush via-white to-accent/10" />
      )}

      <h3 className="mt-3 font-display text-sm font-semibold text-primary xl:text-base">
        {category.name}
      </h3>

      {category.description ? (
        <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-foreground/70">
          {category.description}
        </p>
      ) : null}

      <Link
        href={category.href}
        className="btn-primary mt-3 inline-block px-4 py-2 text-xs transition hover:brightness-105"
      >
        View All
      </Link>
    </div>
  );
}
