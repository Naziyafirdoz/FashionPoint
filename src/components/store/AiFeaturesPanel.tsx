import Image from "next/image";
import Link from "next/link";
import { Palette, Ruler, Sparkles, WandSparkles, type LucideIcon } from "lucide-react";

type AiFeature = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

const AI_FEATURES: AiFeature[] = [
  {
    href: "/ai-features/size-finder",
    label: "AI Size Finder",
    description: "Find your perfect fit in seconds",
    icon: Ruler
  },
  {
    href: "/ai-features/color-matcher",
    label: "Saree Color Matcher",
    description: "Match blouses with your saree palette",
    icon: Palette
  },
  {
    href: "/ai-features/style-recommender",
    label: "AI Style Assistant",
    description: "Personalized style recommendations",
    icon: WandSparkles
  }
];

const CARD_CLASS =
  "w-full rounded-[20px] border border-[#F2E4E8] bg-white p-6 shadow-[0_4px_20px_rgba(122,13,43,0.05)]";

export function AiFeaturesPanel({ premium = false }: { premium?: boolean }) {
  if (!premium) {
    return (
      <aside className="hidden space-y-4 lg:block">
        <div className="card-store">
          <h3 className="font-bold text-primary">AI FEATURES</h3>
          <ul className="mt-3 space-y-2.5 text-sm">
            {AI_FEATURES.map((feature) => (
              <li key={feature.href}>
                <Link href={feature.href} className="hover:text-primary">
                  {feature.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/ai-features" className="btn-primary mt-4 block w-full text-center text-xs">
            TRY AI MAGIC
          </Link>
        </div>
        <div className="card-store bg-primary text-white">
          <p className="font-display font-bold">FIND YOUR PERFECT BLOUSE</p>
          <Link
            href="/ai-features/size-finder"
            className="mt-3 inline-block rounded-full bg-secondary px-4 py-2 text-xs font-bold text-foreground"
          >
            START NOW
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-full min-w-0 max-w-full flex-col">
      <div className="flex w-full flex-col space-y-6 lg:sticky lg:top-[clamp(4.5rem,8vh,6rem)] lg:z-0">
        <div className={CARD_CLASS}>
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-5 w-5 text-secondary" aria-hidden="true" />
          <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-primary">
            AI Features
          </h3>
        </div>
        <p className="mt-2.5 text-sm leading-relaxed text-[#666666]">
          Smart tools to help you find the perfect blouse faster.
        </p>
        <ul className="mt-6 space-y-3.5">
          {AI_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <li key={feature.href}>
                <Link href={feature.href} className="block">
                  <div className="flex gap-3.5 rounded-xl border border-[#F2E4E8] bg-[#FFFCFA] px-4 py-4 transition duration-200 hover:border-primary/25 hover:bg-[#FFF5F7]">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#F2E4E8] bg-white text-primary">
                      <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 py-0.5">
                      <p className="text-sm font-semibold leading-tight text-[#2A2A2A]">
                        {feature.label}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-[#666666]">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        <Link
          href="/ai-features"
          className="btn-primary mt-7 block w-full rounded-[12px] py-3.5 text-center text-sm font-bold uppercase tracking-[0.06em]"
        >
          Try AI Magic
        </Link>
        </div>

        <div className={CARD_CLASS}>
        <p className="font-display text-base font-bold leading-snug text-primary">
          Find Your Perfect Blouse
        </p>
        <p className="mt-2.5 text-sm leading-relaxed text-[#666666]">
          Discover styles tailored to your occasion, fit, and saree palette.
        </p>
        <div className="relative mt-5 h-[140px] overflow-hidden rounded-xl bg-[#FBF7F4]">
          <Image
            src="/assets/hero/hero-model.png"
            alt=""
            fill
            className="object-contain object-bottom px-2"
            sizes="260px"
          />
        </div>
        <Link
          href="/ai-features/size-finder"
          className="btn-primary mt-5 inline-flex h-11 w-full items-center justify-center rounded-[12px] text-sm font-bold uppercase tracking-[0.06em]"
        >
          Start Now
        </Link>
        </div>
      </div>
    </aside>
  );
}
