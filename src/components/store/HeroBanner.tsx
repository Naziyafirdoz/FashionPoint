"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Palette,
  Ruler,
  Sparkles,
  Star
} from "lucide-react";

const HERO_ASSETS = {
  originalBg: "/assets/hero/original-bg.png",
  goldFrame: "/assets/hero/gold-circle-frame.png",
  model: "/assets/hero/hero-model.png",
  floralLeft: "/assets/hero/floral-left.png",
  floralRight: "/assets/hero/floral-right.png"
} as const;

const FEATURE_CHIPS = [
  "Ready-made",
  "Premium Quality",
  "Perfect Fit",
  "Comfortable All Day"
];

const AI_FEATURES = [
  {
    icon: Ruler,
    label: "AI Size Finder",
    detail: "Find your perfect fit in seconds",
    iconBg: "bg-accent/15 text-accent"
  },
  {
    icon: Palette,
    label: "Color Match",
    detail: "Match with your saree",
    iconBg: "bg-primary/10 text-primary"
  },
  {
    icon: Sparkles,
    label: "Style Assistant",
    detail: "Personalized style picks",
    iconBg: "bg-[#9b4d6d]/10 text-[#9b4d6d]"
  }
];

const AVATAR_COLORS = ["#f5c4d4", "#e8b4c8", "#d4a5b9", "#c995aa", "#f0d0dc"];

export function HeroBanner() {
  return (
    <section className="hero-premium relative overflow-visible" aria-label="Premium ready-made Indian blouses">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        <Image
          src={HERO_ASSETS.originalBg}
          alt=""
          fill
          className="object-cover object-center"
          sizes="100vw"
          priority
        />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:gap-10 sm:py-12 lg:grid-cols-3 lg:items-center lg:gap-8 lg:py-14 xl:gap-10">
        {/* Left — content */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="relative z-10 order-2 text-center lg:order-1 lg:mr-7 lg:justify-self-start lg:text-left"
        >
          <div className="flex items-center justify-center gap-3 lg:justify-start">
            <span className="hidden h-px w-8 bg-secondary/70 sm:block" aria-hidden="true" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/75 sm:text-[11px]">
              Premium Ready-Made Indian Blouses
            </p>
          </div>

          <h1 className="mt-4 font-display text-[2.6rem] font-bold leading-[1.02] text-primary sm:text-5xl lg:text-[3.35rem] xl:text-[3.6rem]">
            Style{" "}
            <span className="bg-gradient-to-b from-[#d4a820] via-secondary to-[#9a7209] bg-clip-text font-display italic text-transparent">
              &
            </span>
            <br />
            Confidence
          </h1>

          <div className="mx-auto mt-4 flex max-w-xs items-center justify-center gap-2 lg:mx-0 lg:justify-start">
            <span className="text-secondary" aria-hidden="true">
              ✦
            </span>
            <p className="text-sm leading-relaxed text-foreground/65 sm:text-[15px]">
              For Every Occasion — crafted for the modern Indian woman
            </p>
          </div>

          <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-x-3 gap-y-2.5 text-left sm:gap-x-5 lg:mx-0">
            {FEATURE_CHIPS.map((chip) => (
              <div key={chip} className="flex items-center gap-2 text-sm text-foreground/80">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary/15">
                  <Check className="h-3 w-3 text-secondary" strokeWidth={2.5} aria-hidden="true" />
                </span>
                {chip}
              </div>
            ))}
          </div>

          <Link
            href="/daily-wear"
            className="group hero-cta-lift mt-8 inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-primary via-[#8f1230] to-primary px-6 py-3.5 text-xs font-semibold tracking-wide text-white shadow-[0_10px_28px_rgba(123,13,43,0.22)] hover:from-[#8f1230] hover:via-primary hover:to-[#9a1535] hover:shadow-[0_14px_34px_rgba(184,134,11,0.22)] sm:px-7 sm:text-sm"
          >
            SHOP READY-MADE BLOUSES
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-secondary/25">
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </Link>

          <div className="mt-5 flex flex-col items-center gap-2.5 lg:items-start">
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-foreground/65 lg:justify-start">
              <span>Newly Launched with 1K+ Happy Customers</span>
              <span className="flex text-secondary" aria-label="5 out of 5 stars">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                ))}
              </span>
            </div>
            <div className="flex -space-x-2" aria-hidden="true">
              {AVATAR_COLORS.map((color, i) => (
                <span
                  key={i}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-primary/70 shadow-sm"
                  style={{ backgroundColor: color }}
                >
                  {String.fromCharCode(65 + i)}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Center — hero artwork */}
        <div className="relative z-10 order-1 flex justify-center overflow-visible lg:order-2 lg:translate-x-5">
          <div className="relative aspect-[4/6.25] w-full max-w-[20rem] overflow-visible sm:max-w-[22rem] md:max-w-[24rem] lg:max-w-[26rem]">
          {/* Pink ambient glow behind circle */}
          <div
            className="hero-gold-ambient pointer-events-none absolute left-1/2 top-[40%] z-[1] aspect-square w-[122%] -translate-x-1/2 -translate-y-1/2 rounded-full"
            aria-hidden="true"
          />

          <div className="absolute left-1/2 top-[40%] z-[1] aspect-square w-[122%] -translate-x-1/2 -translate-y-1/2">
            <div className="hero-gold-frame relative h-full w-full">
              <Image
                src={HERO_ASSETS.goldFrame}
                alt=""
                fill
                className="hero-gold-frame-image object-contain"
                sizes="(max-width: 768px) 280px, (max-width: 1024px) 320px, 360px"
                priority
              />
              <div
                className="hero-gold-inner-lighten pointer-events-none absolute left-1/2 top-1/2 z-[1] aspect-square w-[76%] -translate-x-1/2 -translate-y-1/2 rounded-full"
                aria-hidden="true"
              />
            </div>
          </div>

          <div
            className="pointer-events-none absolute left-1/2 top-[40%] z-[1] aspect-square w-[122%] -translate-x-1/2 -translate-y-1/2 bg-transparent"
            aria-hidden="true"
          >
            <Image
              src={HERO_ASSETS.floralLeft}
              alt=""
              width={445}
              height={561}
              unoptimized
              className="hero-floral-left hero-floral-shadow absolute bottom-[0%] left-[-6%] h-auto w-[8.5rem] bg-transparent sm:w-[12rem] md:w-[14rem] lg:w-[19rem]"
              sizes="(max-width: 640px) 136px, (max-width: 1024px) 224px, 304px"
              style={{ background: "transparent" }}
            />
            <Image
              src={HERO_ASSETS.floralRight}
              alt=""
              width={535}
              height={467}
              unoptimized
              className="hero-floral-right hero-floral-shadow absolute bottom-[2%] right-[-8%] h-auto w-[8.5rem] bg-transparent sm:w-[12rem] md:w-[14rem] lg:w-[19rem]"
              sizes="(max-width: 640px) 136px, (max-width: 1024px) 224px, 304px"
              style={{ background: "transparent" }}
            />
          </div>

          <div className="absolute bottom-0 left-1/2 top-0 z-[2] w-[122%] -translate-x-1/2 translate-y-4">
            <div className="hero-model absolute inset-x-0 bottom-0 h-[120%]">
              <Image
                src={HERO_ASSETS.model}
                alt="Elegant Indian woman in a premium embroidered ready-made blouse with traditionally draped saree, gold jewellery, and floral bridal hairstyle"
                fill
                unoptimized
                className="hero-model-image object-contain"
                sizes="(max-width: 768px) 320px, (max-width: 1024px) 352px, 416px"
                style={{ background: "transparent" }}
                priority
              />
            </div>
          </div>

          <span className="hero-ai-badge-glow absolute right-[-70px] top-[calc(24%-20px)] z-20 flex h-14 w-[10.25rem] items-center gap-3 rounded-full px-3.5 sm:right-[-76px] lg:right-[-80px]">
            <Sparkles className="relative z-[1] h-4 w-4 shrink-0 text-[#D8B15A]" aria-hidden="true" />
            <span className="relative z-[1] flex flex-col leading-[1.08]">
              <span className="text-[10px] font-bold tracking-[0.14em] text-[#D8B15A] sm:text-[11px]">
                AI STYLE
              </span>
              <span className="text-[9px] font-semibold tracking-[0.12em] text-white sm:text-[10px]">
                SUGGESTION
              </span>
            </span>
          </span>
          </div>
        </div>

        {/* Right — AI assistant card */}
        <div className="hero-card-fade relative z-10 order-3 lg:ml-7 lg:justify-self-end lg:translate-x-5">
          <div className="rounded-[1.75rem] border border-accent/10 bg-white p-5 shadow-[0_12px_40px_rgba(123,13,43,0.08)] sm:p-6 lg:max-w-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-secondary/20 to-accent/10">
                <Sparkles className="h-5 w-5 text-secondary" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold uppercase tracking-wide text-primary sm:text-xl">
                  AI Style Assistant
                </h2>
                <p className="mt-0.5 text-sm text-foreground/55">Your personal blouse expert</p>
              </div>
            </div>

            <ul className="mt-5 space-y-3.5">
              {AI_FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <li
                    key={feature.label}
                    className="flex gap-3 rounded-2xl border border-accent/8 bg-blush/20 px-3 py-3"
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${feature.iconBg}`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="text-sm leading-snug">
                      <p className="font-semibold text-primary">{feature.label}</p>
                      <p className="mt-0.5 text-foreground/55">{feature.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <Link
              href="/ai-features"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-[#8f1230] py-3.5 text-xs font-semibold uppercase tracking-wide text-white shadow-[0_8px_22px_rgba(123,13,43,0.2)] transition hover:shadow-[0_10px_26px_rgba(184,134,11,0.18)] sm:text-sm"
            >
              <Sparkles className="h-4 w-4 text-secondary" aria-hidden="true" />
              Get Style Suggestions
            </Link>
          </div>
        </div>
      </div>

      <div className="hero-smoke-mist pointer-events-none absolute inset-x-0 bottom-0 z-[15]" aria-hidden="true" />
    </section>
  );
}
