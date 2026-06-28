"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const LEGACY_CARD_HEIGHT = 330;
const BANNER_CARD_WIDTH = 380;
const CARD_GAP = 16;
const DESKTOP_VISIBLE_CARD_COUNT = 3;

const EXPLORE_COLLECTIONS_BG = "/assets/hero/explore-collections-bg.png";
const EXPLORE_COLLECTIONS_DIVIDER = "/assets/hero/explore-collections-divider.png";

const FALLBACK_DESCRIPTION =
  "Explore our curated collection of premium ready-made blouses.";

export type HomeCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  homepage_banner_image_url?: string;
  sort_order: number;
  theme?: string;
  button_text?: string;
};

const HOMEPAGE_THEME_GRADIENTS: Record<string, string> = {
  blush: "linear-gradient(160deg, #FFF0F3 0%, #FFE4EC 100%)",
  rose: "linear-gradient(160deg, #FFF0F5 0%, #FFE0EA 100%)",
  peach: "linear-gradient(160deg, #FFF5F0 0%, #FFE8DC 100%)",
  cream: "linear-gradient(160deg, #FFFBF4 0%, #F8F0E4 100%)",
  gold: "linear-gradient(160deg, #FBF6EE 0%, #F2E8D4 100%)",
  lavender: "linear-gradient(160deg, #F7F2FF 0%, #EDE4FF 100%)",
  lilac: "linear-gradient(160deg, #F8F3FF 0%, #EAE0FF 100%)",
  sky: "linear-gradient(160deg, #EFF8FF 0%, #E0F0FF 100%)",
  mint: "linear-gradient(160deg, #F0FAF8 0%, #E2F2EE 100%)",
  sage: "linear-gradient(160deg, #F2F7F2 0%, #E4EEE4 100%)",
  coral: "linear-gradient(160deg, #FFF3F0 0%, #FFE4DC 100%)",
  pearl: "linear-gradient(160deg, #FFFCFA 0%, #F5F0EC 100%)",
  sand: "linear-gradient(160deg, #FAF6F1 0%, #F0E8DC 100%)",
  maroon: "linear-gradient(160deg, #FBF0F3 0%, #F3E0E6 100%)",
  emerald: "linear-gradient(160deg, #EFF8F4 0%, #DCEFE6 100%)"
};

const PROMO_LINK_CLASSNAME =
  "group relative block h-full w-full overflow-hidden rounded-[18px] border border-black/[0.08] bg-white shadow-[0_8px_28px_rgba(123,13,43,0.1)] transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_14px_36px_rgba(123,13,43,0.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const LEGACY_LINK_CLASSNAME =
  "group relative flex h-full flex-col overflow-hidden rounded-[22px] border border-black/[0.06] bg-white shadow-[0_6px_24px_rgba(123,13,43,0.08)] transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_14px_36px_rgba(123,13,43,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function getHomeCategoryDescription(description?: string | null): string {
  const trimmed = description?.trim();
  return trimmed || FALLBACK_DESCRIPTION;
}

export function getHomeCategoryHref(slug: string): string {
  return slug === "soon" ? "/soon" : `/${slug}`;
}

type CategoryCollectionCardProps = {
  category: HomeCategory;
  index: number;
};

function BannerPromoCard({ category, index }: CategoryCollectionCardProps) {
  const href = getHomeCategoryHref(category.slug);
  const bannerUrl = category.homepage_banner_image_url!.trim();

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, delay: (index % 6) * 0.05, ease: "easeOut" }}
      className="aspect-[16/9] w-[min(calc(100vw-5rem),380px)] shrink-0 snap-start sm:w-[360px] lg:w-[380px]"
    >
      <Link
        href={href}
        className={PROMO_LINK_CLASSNAME}
        aria-label={`View ${category.name} collection`}
      >
        <Image
          src={bannerUrl}
          alt={`${category.name} collection banner`}
          fill
          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 380px"
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
          loading="lazy"
          unoptimized={bannerUrl.startsWith("data:")}
        />
      </Link>
    </motion.article>
  );
}

function LegacyCategoryCard({ category, index }: CategoryCollectionCardProps) {
  const href = getHomeCategoryHref(category.slug);
  const description = getHomeCategoryDescription(category.description);
  const themeKey = category.theme?.trim().toLowerCase() || "blush";
  const gradient =
    HOMEPAGE_THEME_GRADIENTS[themeKey] ?? HOMEPAGE_THEME_GRADIENTS.blush;
  const buttonText = category.button_text?.trim() || "View Collection";

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, delay: (index % 6) * 0.05, ease: "easeOut" }}
      className="w-[230px] shrink-0 snap-start sm:w-[230px]"
      style={{ height: LEGACY_CARD_HEIGHT }}
    >
      <Link href={href} className={LEGACY_LINK_CLASSNAME} aria-label={`View ${category.name} collection`}>
        <div className="absolute inset-0" style={{ background: gradient }} aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-0 rounded-[22px]"
          style={{
            background:
              "linear-gradient(155deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.08) 45%, transparent 70%)"
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 flex min-h-0 flex-1 flex-col px-5 pb-5 pt-6">
          <div className="max-w-[58%] pr-1">
            <h3 className="font-display text-[26px] font-bold leading-[1.12] text-primary sm:text-[28px]">
              {category.name}
            </h3>
            <div className="mt-2.5 h-[2px] w-9 rounded-full bg-primary/35" aria-hidden="true" />
            <p className="mt-3 line-clamp-3 text-base leading-snug text-foreground/55">
              {description}
            </p>
          </div>

          <span className="mt-auto inline-flex w-fit items-center gap-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary transition-all duration-300 group-hover:underline">
            {buttonText}
            <span aria-hidden="true">→</span>
          </span>
        </div>

        {category.image_url ? (
          <div className="pointer-events-none absolute bottom-0 right-0 z-10 h-[62%] w-[48%]">
            <Image
              src={category.image_url}
              alt={category.name}
              fill
              sizes="120px"
              className="object-contain object-bottom object-right transition-transform duration-300 ease-out will-change-transform group-hover:scale-[1.03]"
              loading="lazy"
            />
          </div>
        ) : null}
      </Link>
    </motion.article>
  );
}

function CategoryCollectionCard({ category, index }: CategoryCollectionCardProps) {
  const bannerUrl = category.homepage_banner_image_url?.trim();
  const hasBanner = Boolean(bannerUrl);

  if (hasBanner) {
    return <BannerPromoCard category={category} index={index} />;
  }

  return <LegacyCategoryCard category={category} index={index} />;
}

type CategoryCardsClientProps = {
  categories: HomeCategory[];
};

export function CategoryCardsClient({ categories }: CategoryCardsClientProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ startX: 0, scrollLeft: 0 });

  const updateScrollState = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    const maxScroll = container.scrollWidth - container.clientWidth;
    setCanScrollPrev(container.scrollLeft > 4);
    setCanScrollNext(container.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const container = scrollRef.current;
    if (!container) return;

    container.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      container.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [categories.length, updateScrollState]);

  const scrollByDirection = useCallback((direction: -1 | 1) => {
    const container = scrollRef.current;
    if (!container) return;

    const scrollAmount = Math.max(
      container.clientWidth * 0.75,
      BANNER_CARD_WIDTH + CARD_GAP
    );
    container.scrollBy({ left: scrollAmount * direction, behavior: "smooth" });
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollByDirection(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollByDirection(1);
      }
    },
    [scrollByDirection]
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = scrollRef.current;
    if (!container) return;

    setIsDragging(true);
    dragState.current = {
      startX: event.clientX,
      scrollLeft: container.scrollLeft
    };
    container.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const container = scrollRef.current;
    if (!container) return;

    const delta = event.clientX - dragState.current.startX;
    container.scrollLeft = dragState.current.scrollLeft - delta;
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    scrollRef.current?.releasePointerCapture(event.pointerId);
  };

  if (categories.length === 0) return null;

  const showCarouselNav = categories.length > DESKTOP_VISIBLE_CARD_COUNT;

  return (
    <section
      id="explore-collections"
      className="relative w-full scroll-mt-20 overflow-hidden"
      aria-label="Shop collections"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-hidden bg-[#FFF8F5]"
      >
        <Image
          src={EXPLORE_COLLECTIONS_BG}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center"
          loading="lazy"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[1400px] px-4 py-12 sm:py-14">
        <header className="mx-auto text-center">
          <Image
            src={EXPLORE_COLLECTIONS_DIVIDER}
            alt=""
            width={267}
            height={40}
            aria-hidden
            sizes="267px"
            className="mx-auto mb-1 block h-auto w-auto max-w-[min(100%,267px)]"
          />
          <h2 className="font-display text-[42px] font-bold leading-tight text-primary sm:text-[48px] lg:text-[56px]">
            Explore Our Collections
          </h2>
          <p className="mx-auto mt-3 max-w-[700px] text-base leading-relaxed text-foreground/55 sm:text-lg">
            Discover beautifully crafted ready-made blouse collections for every occasion.
          </p>
        </header>

        <div className="relative mx-auto mt-[60px] w-full max-w-[1288px]">
        {showCarouselNav ? (
          <button
            type="button"
            onClick={() => scrollByDirection(-1)}
            disabled={!canScrollPrev}
            className="absolute left-0 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-black/[0.08] bg-white text-foreground/70 shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition hover:border-primary/20 hover:text-primary disabled:pointer-events-none disabled:opacity-0 sm:-left-1 sm:h-11 sm:w-11"
            aria-label="Previous collections"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        ) : null}

        <div
          ref={scrollRef}
          tabIndex={0}
          role="region"
          aria-roledescription="carousel"
          aria-label="Category collections"
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={`mx-auto flex items-start gap-4 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            isDragging ? "cursor-grabbing select-none" : "cursor-grab"
          } snap-x snap-mandatory px-10 sm:px-14 md:max-w-[776px] lg:max-w-[1172px] lg:px-0`}
        >
          {categories.map((category, index) => (
            <CategoryCollectionCard key={category.id} category={category} index={index} />
          ))}
        </div>

        {showCarouselNav ? (
          <button
            type="button"
            onClick={() => scrollByDirection(1)}
            disabled={!canScrollNext}
            className="absolute right-0 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-black/[0.08] bg-white text-foreground/70 shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition hover:border-primary/20 hover:text-primary disabled:pointer-events-none disabled:opacity-0 sm:-right-1 sm:h-11 sm:w-11"
            aria-label="Next collections"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        ) : null}
        </div>
      </div>
    </section>
  );
}
