"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Award,
  RotateCcw,
  Ruler,
  ShieldCheck,
  Shirt,
  Wind,
  type LucideIcon
} from "lucide-react";
import type { ReactNode } from "react";

const CATEGORY_HERO_BACKGROUND = "/assets/hero/category-hero.png";
const CATEGORY_HERO_MODEL = "/assets/hero/category-model.png";

const HERO_FEATURES: { label: string; icon: LucideIcon }[] = [
  { label: "Premium Quality", icon: Award },
  { label: "Ready Made", icon: Shirt },
  { label: "Perfect Fit", icon: Ruler },
  { label: "Soft Fabric", icon: Wind },
  { label: "Easy Returns", icon: RotateCcw },
  { label: "Secure Payment", icon: ShieldCheck }
];

type CategoryHeroSectionProps = {
  title: string;
  description: string;
  cta?: ReactNode;
};

function HeroFeatureRow() {
  return (
    <div className="grid max-w-[520px] grid-cols-3 gap-x-2 gap-y-5 sm:flex sm:max-w-none sm:items-start sm:gap-0 lg:max-w-[580px]">
      {HERO_FEATURES.map((feature, index) => {
        const Icon = feature.icon;
        return (
          <div key={feature.label} className="flex min-w-0 flex-1 items-stretch">
            {index > 0 ? (
              <div
                className="mr-2 hidden w-px shrink-0 self-center bg-primary/20 sm:mr-3 sm:block sm:h-10 lg:mr-4"
                aria-hidden="true"
              />
            ) : null}
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2 px-1 text-center sm:px-2">
              <Icon
                className="h-6 w-6 shrink-0 text-primary sm:h-7 sm:w-7"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <span className="text-[10px] leading-tight text-[#444] sm:text-[11px] lg:text-xs">
                {feature.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CategoryHeroSection({ title, description, cta }: CategoryHeroSectionProps) {
  return (
    <section className="w-full bg-[#FFF4F4]" aria-label={`${title} hero`}>
      <div className="mx-auto w-full max-w-[1350px] px-4 sm:px-6 lg:px-8">
        <div className="relative min-h-[520px] overflow-hidden rounded-3xl shadow-[0_12px_40px_rgba(123,13,43,0.08)] sm:min-h-[560px] lg:h-[360px] lg:min-h-[360px]">
          <Image
            src={CATEGORY_HERO_BACKGROUND}
            alt=""
            fill
            priority
            sizes="(max-width: 1350px) 100vw, 1350px"
            className="object-cover object-[left_center]"
            aria-hidden="true"
          />

          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-[58%] bg-gradient-to-r from-white/10 via-white/[0.07] to-transparent"
            aria-hidden="true"
          />

          <div className="relative z-10 flex h-full min-h-[520px] flex-col lg:min-h-[360px] lg:flex-row">
            <div className="flex w-full flex-col justify-center py-10 pl-2 pr-4 sm:pl-4 sm:pr-6 lg:w-[45%] lg:py-[55px] lg:pl-[70px] lg:pr-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                className="relative w-full"
              >
                <nav
                  aria-label="Breadcrumb"
                  className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-foreground/55 sm:text-sm"
                >
                  <Link href="/" className="transition hover:text-primary">
                    Home
                  </Link>
                  <span className="text-foreground/40" aria-hidden="true">
                    &gt;
                  </span>
                  <span className="font-medium text-foreground/65">{title}</span>
                </nav>

                <h1 className="font-display text-3xl font-bold leading-[1.05] text-primary sm:text-4xl lg:text-[58px]">
                  {title}
                </h1>

                <p className="mt-4 max-w-[480px] text-base font-normal leading-snug text-[#444] sm:text-lg lg:text-2xl">
                  {description}
                </p>

                <div className="mt-8">{cta ?? <HeroFeatureRow />}</div>
              </motion.div>
            </div>

            <div className="relative mt-2 flex h-[260px] w-full shrink-0 items-end justify-end px-4 pb-3 sm:h-[280px] sm:px-6 lg:absolute lg:bottom-0 lg:right-0 lg:mt-0 lg:h-full lg:w-[34%] lg:px-4 lg:pb-0">
              <div className="relative h-full w-full max-w-[320px] lg:max-w-none">
                <Image
                  src={CATEGORY_HERO_MODEL}
                  alt={`${title} model`}
                  fill
                  priority
                  sizes="(max-width: 1024px) 320px, 460px"
                  className="object-contain object-bottom object-right"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
