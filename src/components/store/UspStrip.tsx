import { Bot, CreditCard, Gem, RotateCcw, Shield } from "lucide-react";

const ITEMS = [
  { icon: Shield, title: "PREMIUM QUALITY", sub: "Fine fabrics & finishing" },
  { icon: RotateCcw, title: "EASY RETURNS", sub: "7-day hassle-free" },
  { icon: Gem, title: "DESIGNER COLLECTIONS", sub: "Curated for every occasion" },
  { icon: CreditCard, title: "100% SECURE PAYMENT", sub: "Razorpay protected" },
  { icon: Bot, title: "AI STYLE ASSISTANT", sub: "Smart recommendations" }
];

export function UspStrip() {
  return (
    <section className="border-y border-accent/20 bg-white py-8">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:grid-cols-2 lg:grid-cols-5">
        {ITEMS.map(({ icon: Icon, title, sub }) => (
          <div key={title} className="flex flex-col items-center text-center">
            <Icon className="h-8 w-8 text-primary" />
            <p className="mt-2 text-xs font-bold text-primary">{title}</p>
            <p className="text-xs text-foreground/60">{sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
