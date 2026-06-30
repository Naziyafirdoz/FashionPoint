"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  Ban,
  ShieldCheck,
  Shirt,
  type LucideIcon
} from "lucide-react";
import type { ReactNode } from "react";
import { formatHeroDescription } from "@/lib/categories/format-hero-description";

const CATEGORY_HERO_BACKGROUND = "/assets/hero/category-bg.png";

type HeroFeature = {
  lines: string[];
  icon: LucideIcon;
};

const HERO_FEATURES: HeroFeature[] = [
  { lines: ["Premium", "Quality"], icon: Award },
  { lines: ["Ready", "Made"], icon: Shirt },
  { lines: ["Secure", "Payment"], icon: ShieldCheck },
  { lines: ["No Return", "No Exchange"], icon: Ban }
];

type CategoryHeroSectionProps = {
  title: string;
  description: string;
  imageUrl?: string;
  cta?: ReactNode;
  plainBackground?: boolean;
};

function HeroFeatureRow() {
  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-wrap items-center justify-center gap-x-1 gap-y-2 sm:flex-nowrap sm:gap-x-0 sm:gap-y-0">
      {HERO_FEATURES.map((feature, index) => {
        const Icon = feature.icon;
        const isReturnPolicy = feature.lines[0] === "No Return";

        return (
          <div
            key={feature.lines.join(" ")}
            className={`flex min-w-[4rem] items-center sm:min-w-0 ${
              isReturnPolicy ? "flex-[1.05] basis-[26%] sm:basis-0" : "flex-1 basis-[23%] sm:basis-0"
            }`}
          >
            {index > 0 ? (
              <div
                className="mr-1 hidden h-[26px] w-px shrink-0 bg-primary/10 sm:block sm:mr-1.5"
                aria-hidden="true"
              />
            ) : null}
            <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-center">
              <Icon
                className="h-[15px] w-[15px] shrink-0 text-primary"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <span className="flex min-h-[1.9rem] flex-col items-center justify-center text-[10px] font-medium leading-[1.15] text-[#333] sm:min-h-[2rem] sm:text-[11px]">
                {feature.lines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DefaultHeroCta() {
  function scrollToListing(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const hero = event.currentTarget.closest("section");
    hero?.nextElementSibling?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <Link
      href="#"
      onClick={scrollToListing}
      className="group mt-4 inline-flex h-11 w-fit items-center gap-1.5 rounded-full bg-primary px-6 text-sm font-semibold text-white shadow-[0_5px_16px_rgba(123,13,43,0.14)] transition hover:bg-[#8f1230] hover:shadow-[0_7px_20px_rgba(123,13,43,0.2)] sm:px-7"
    >
      Explore Collection
      <ArrowRight
        className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}

export function CategoryHeroSection({
  title,
  description,
  imageUrl,
  cta,
  plainBackground = false
}: CategoryHeroSectionProps) {
  const heroBackground = imageUrl || CATEGORY_HERO_BACKGROUND;
  const heroDescription = formatHeroDescription(description);

  return (
    <section
      className="relative w-full overflow-x-clip"
      aria-label={`${title} hero`}
    >
      {!plainBackground ? (
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
          <Image
            src={heroBackground}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-right"
          />
        </div>
      ) : null}

      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center px-5 py-6 sm:px-6 sm:py-7 md:py-8 lg:h-[min(300px,42vw)] lg:min-h-[260px] lg:max-h-[300px] lg:grid-cols-[minmax(0,420px)_1fr] lg:py-0 lg:pl-8 lg:pr-10 xl:pl-10 xl:pr-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="flex w-full max-w-[420px] flex-col"
        >
          <nav
            aria-label="Breadcrumb"
            className="mb-2 flex flex-wrap items-center gap-1 text-[12px] text-foreground/55 sm:text-[13px]"
          >
            <Link href="/" className="transition hover:text-primary">
              Home
            </Link>
            <span className="text-foreground/40" aria-hidden="true">
              &gt;
            </span>
            <span className="font-medium text-foreground/65">{title}</span>
          </nav>

          <h1 className="mb-2 font-display text-[2rem] font-bold leading-[1.12] text-primary sm:text-[2.25rem] lg:text-[2.5rem]">
            {title}
          </h1>

          <p
            className="mb-3 text-base font-medium leading-snug text-[#444]/90 sm:leading-relaxed"
            title={description !== heroDescription ? description : undefined}
          >
            {heroDescription}
          </p>

          <HeroFeatureRow />

          {cta ?? <DefaultHeroCta />}
        </motion.div>

        <div className="hidden min-h-[1px] lg:block" aria-hidden="true" />
      </div>
    </section>
  );
}
