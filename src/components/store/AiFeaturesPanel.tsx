import Link from "next/link";
import {
  Bot,
  Palette,
  Ruler,
  Sparkles,
  WandSparkles,
  type LucideIcon
} from "lucide-react";

type AiFeature = {
  href?: string;
  label: string;
  description: string;
  icon: LucideIcon;
  soon?: boolean;
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
  },
  {
    label: "Virtual Try-On",
    description: "Coming Soon",
    icon: Bot,
    soon: true
  }
];

export function AiFeaturesPanel({ premium = false }: { premium?: boolean }) {
  if (!premium) {
    return (
      <aside className="hidden space-y-4 lg:block">
        <div className="card-store">
          <h3 className="font-bold text-primary">AI FEATURES</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/ai-features/size-finder" className="hover:text-primary">
                AI Size Finder
              </Link>
            </li>
            <li>
              <Link href="/ai-features/color-matcher" className="hover:text-primary">
                Saree Color Matcher
              </Link>
            </li>
            <li>
              <Link href="/ai-features/style-recommender" className="hover:text-primary">
                AI Style Assistant
              </Link>
            </li>
            <li>
              <span className="text-foreground/50">Virtual Try-On (Soon)</span>
            </li>
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
    <aside className="hidden space-y-5 lg:block">
      <div className="rounded-[18px] border border-black/[0.06] bg-white/95 p-5 shadow-[0_8px_28px_rgba(123,13,43,0.08)] lg:sticky lg:top-24 lg:self-start">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-secondary" aria-hidden="true" />
          <h3 className="font-display text-lg font-bold text-primary">AI Features</h3>
        </div>
        <ul className="mt-4 space-y-3">
          {AI_FEATURES.map((feature) => {
            const Icon = feature.icon;
            const content = (
              <div className="flex gap-3 rounded-2xl border border-accent/10 bg-[#FFFCFA] px-3 py-3 transition hover:border-primary/15 hover:shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
                  <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-primary">{feature.label}</p>
                  <p className="text-xs leading-relaxed text-foreground/55">{feature.description}</p>
                </div>
              </div>
            );

            if (feature.soon || !feature.href) {
              return <li key={feature.label}>{content}</li>;
            }

            return (
              <li key={feature.label}>
                <Link href={feature.href} className="block">
                  {content}
                </Link>
              </li>
            );
          })}
        </ul>
        <Link
          href="/ai-features"
          className="btn-primary mt-5 block w-full py-3 text-center text-sm font-semibold"
        >
          Try AI Magic
        </Link>
      </div>

      <div className="overflow-hidden rounded-[18px] border border-primary/15 bg-gradient-to-br from-primary via-[#8f1230] to-primary p-5 text-white shadow-[0_10px_30px_rgba(123,13,43,0.2)]">
        <p className="font-display text-lg font-bold leading-tight">Find Your Perfect Blouse</p>
        <p className="mt-2 text-sm leading-relaxed text-white/80">
          Discover styles tailored to your occasion, fit, and saree palette with our smart
          recommendation tools.
        </p>
        <div
          className="mt-4 flex h-24 items-center justify-center rounded-2xl border border-white/15 bg-white/10"
          aria-hidden="true"
        >
          <Sparkles className="h-10 w-10 text-secondary/80" />
        </div>
        <Link
          href="/ai-features/size-finder"
          className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-secondary px-4 py-2.5 text-sm font-bold text-foreground transition hover:brightness-105"
        >
          Start Now
        </Link>
      </div>
    </aside>
  );
}
