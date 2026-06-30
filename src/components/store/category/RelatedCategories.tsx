import Link from "next/link";
import type { RelatedCategory } from "@/types";
import { ProductImage } from "@/components/store/ProductImage";

type RelatedCategoriesProps = {
  categories: RelatedCategory[];
};

const CARD_CLASSNAME =
  "group relative block h-full w-full overflow-hidden rounded-[18px] border border-[#F2E4E8] bg-white shadow-[0_8px_28px_rgba(123,13,43,0.08)] transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:border-[#7B0D2B]/20 hover:shadow-[0_14px_36px_rgba(122,13,43,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const BANNER_IMAGE_SIZES = "(max-width: 640px) 85vw, (max-width: 1024px) 45vw, 25vw";

function RelatedCategoryBannerCard({ category }: { category: RelatedCategory }) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className={CARD_CLASSNAME}
      aria-label={`View ${category.name} collection`}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        <div className="absolute inset-0 transition-transform duration-300 ease-out group-hover:scale-[1.05]">
          <ProductImage
            src={category.banner_image_url}
            alt={`${category.name} collection banner`}
            className="object-cover"
            sizes={BANNER_IMAGE_SIZES}
          />
        </div>
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#2A0A12]/75 via-[#2A0A12]/25 to-transparent"
          aria-hidden="true"
        />
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <p className="font-display text-lg font-bold leading-tight text-white sm:text-xl">
            {category.name}
          </p>
          {category.product_count_label ? (
            <p className="mt-1 text-xs font-medium text-white/85 sm:text-sm">
              {category.product_count_label}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function RelatedCategories({ categories }: RelatedCategoriesProps) {
  if (categories.length === 0) return null;

  return (
    <section className="border-t border-[#F2E4E8] bg-white py-10">
      <div className="mx-auto w-full max-w-[1600px] px-6">
        <h2 className="font-display text-2xl font-bold text-[#7B0D2B]">Related Collections</h2>

        <div className="mt-6 flex gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory sm:gap-5 md:grid md:grid-cols-2 md:overflow-visible md:snap-none lg:grid-cols-3 xl:grid-cols-4 [&::-webkit-scrollbar]:hidden">
          {categories.map((category) => (
            <div
              key={category.id}
              className="w-[min(85vw,320px)] shrink-0 snap-start md:w-auto"
            >
              <RelatedCategoryBannerCard category={category} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
