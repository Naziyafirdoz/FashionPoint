"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  Ban,
  Ruler,
  ShieldCheck,
  Shirt,
  type LucideIcon
} from "lucide-react";
import type { ReactNode } from "react";

const CATEGORY_HERO_BACKGROUND = "/assets/hero/category-bg.png";

type HeroFeature = {
  lines: string[];
  icon: LucideIcon;
};

const HERO_FEATURES: HeroFeature[] = [
  { lines: ["Premium", "Quality"], icon: Award },
  { lines: ["Ready", "Made"], icon: Shirt },
  { lines: ["Perfect", "Fit"], icon: Ruler },
  { lines: ["No Exchange", "No Return", "No Refund"], icon: Ban },
  { lines: ["Secure", "Payment"], icon: ShieldCheck }
];

type CategoryHeroSectionProps = {
  title: string;
  description: string;
  cta?: ReactNode;
  plainBackground?: boolean;
};

function HeroFeatureRow() {
  return (
    <div className="flex w-full max-w-[450px] flex-wrap items-center gap-x-2 gap-y-3 sm:flex-nowrap sm:gap-x-0 sm:gap-y-0">
      {HERO_FEATURES.map((feature, index) => {
        const Icon = feature.icon;
        const isReturnPolicy = feature.lines.length === 3;

        return (
          <div
            key={feature.lines.join(" ")}
            className={`flex min-w-[4.5rem] items-center sm:min-w-0 ${
              isReturnPolicy ? "flex-[1.15] basis-[30%] sm:basis-0" : "flex-1 basis-[17%] sm:basis-0"
            }`}
          >
            {index > 0 ? (
              <div
                className="mr-1.5 hidden h-[36px] w-px shrink-0 bg-primary/10 sm:block sm:mr-2"
                aria-hidden="true"
              />
            ) : null}
            <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 text-center sm:gap-2">
              <Icon
                className="h-[18px] w-[18px] shrink-0 text-primary"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <span
                className={`flex flex-col items-center justify-center text-[13px] font-medium leading-[1.25] text-[#333] sm:text-sm ${
                  isReturnPolicy ? "min-h-[2.75rem]" : "min-h-[2.5rem]"
                }`}
              >
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
      className="group mt-5 inline-flex h-11 w-fit items-center gap-1.5 rounded-full bg-primary px-6 text-sm font-semibold text-white shadow-[0_5px_16px_rgba(123,13,43,0.14)] transition hover:bg-[#8f1230] hover:shadow-[0_7px_20px_rgba(123,13,43,0.2)] sm:px-7"
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
  cta,
  plainBackground = false
}: CategoryHeroSectionProps) {
  return (
    <section
      className="relative w-full overflow-x-clip"
      aria-label={`${title} hero`}
    >
      {!plainBackground ? (
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
          <Image
            src={CATEGORY_HERO_BACKGROUND}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-right"
          />
        </div>
      ) : null}

      <div className="relative z-10 mx-auto flex min-h-[330px] w-full max-w-7xl items-center px-5 sm:px-6 md:min-h-[340px] lg:min-h-[350px] lg:pl-8 lg:pr-12 xl:pl-10 xl:pr-16">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="flex w-fit max-w-[520px] -translate-x-6 flex-col sm:-translate-x-8 lg:-translate-x-[50px]"
        >
          <nav
            aria-label="Breadcrumb"
            className="mb-2 flex flex-wrap items-center gap-1 text-[13px] text-foreground/55 sm:text-sm"
          >
            <Link href="/" className="transition hover:text-primary">
              Home
            </Link>
            <span className="text-foreground/40" aria-hidden="true">
              &gt;
            </span>
            <span className="font-medium text-foreground/65">{title}</span>
          </nav>

          <h1 className="mb-2 font-display text-[3.25rem] font-bold leading-[1.1] text-primary sm:text-[3.375rem]">
            {title}
          </h1>

          <p className="mb-4 max-w-md text-lg font-medium leading-snug text-[#444]">
            {description}
          </p>

          <HeroFeatureRow />

          {cta ?? <DefaultHeroCta />}
        </motion.div>
      </div>
    </section>
  );
}
