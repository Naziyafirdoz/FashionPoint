import Link from "next/link";
import { Sparkles } from "lucide-react";

const FEATURES = [
  { title: "AI Size Finder", desc: "Get your perfect blouse size in seconds.", href: "/ai-features/size-finder", cta: "TRY AI SIZE FINDER" },
  { title: "Saree Color Matcher", desc: "Upload your saree and find matching blouse colors.", href: "/ai-features/color-matcher", cta: "TRY COLOR MATCHER" },
  { title: "AI Style Assistant", desc: "Personalized style recommendations.", href: "/ai-features/style-recommender", cta: "CHAT WITH AI STYLIST" },
  { title: "Virtual Try-On", desc: "See blouses on you — coming soon.", href: "/ai-features/smart-preview", cta: "NOTIFY ME" }
];

export const metadata = { title: "AI Features" };

export default function AiFeaturesPage() {
  return (
    <div className="floral-bg">
      <section className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h1 className="font-display text-4xl font-bold text-primary">AI FEATURES</h1>
        <p className="mt-2 text-lg text-foreground/70">Smarter Shopping. Perfect Results.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm">
          {["Personalized", "Accurate", "Saves Time", "Better Confidence"].map((u) => (
            <span key={u} className="flex items-center gap-1 rounded-full bg-white px-4 py-2 shadow">
              <Sparkles className="h-4 w-4 text-secondary" /> {u}
            </span>
          ))}
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-16 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="card-store">
            <h2 className="font-display text-xl font-bold text-primary">{f.title}</h2>
            <p className="mt-2 text-sm text-foreground/70">{f.desc}</p>
            <Link href={f.href} className="btn-primary mt-6 inline-flex">{f.cta}</Link>
          </div>
        ))}
      </section>
      <section className="bg-primary py-12 text-center text-white">
        <p className="font-display text-2xl font-bold">FIND YOUR PERFECT BLOUSE — TRY ALL AI FEATURES</p>
        <Link href="/ai-features/size-finder" className="mt-6 inline-block rounded-full bg-secondary px-8 py-3 font-bold text-foreground">
          GET STARTED
        </Link>
      </section>
    </div>
  );
}
