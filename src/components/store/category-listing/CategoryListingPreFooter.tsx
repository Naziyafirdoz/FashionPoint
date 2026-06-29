import { Headphones, Shield, Shirt, ShieldCheck, type LucideIcon } from "lucide-react";

const HIGHLIGHTS: { icon: LucideIcon; title: string; sub: string }[] = [
  { icon: Shield, title: "Premium Quality", sub: "Fine fabrics & finishing" },
  { icon: Shirt, title: "Ready Made", sub: "Curated ready-to-wear styles" },
  { icon: ShieldCheck, title: "Secure Payment", sub: "100% safe & trusted" },
  { icon: Headphones, title: "Customer Support", sub: "We are here to help you" }
];

export function CategoryListingPreFooter() {
  return (
    <>
      <section className="border-t border-accent/15 bg-white py-12">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-2xl font-bold text-primary sm:text-3xl">Stay Updated</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-foreground/60 sm:text-base">
            Subscribe to receive exclusive offers, new arrivals, and styling inspiration from Fashion
            Point.
          </p>
          <form
            className="mx-auto mt-6 flex max-w-lg flex-col gap-3 sm:flex-row"
            onSubmit={(event) => event.preventDefault()}
          >
            <input
              type="email"
              placeholder="Enter your email address"
              className="flex-1 rounded-full border border-black/[0.08] bg-[#FFFCFA] px-5 py-3 text-sm shadow-sm focus:border-primary/30 focus:outline-none"
            />
            <button type="submit" className="btn-primary px-8 py-3 text-sm">
              Subscribe
            </button>
          </form>
        </div>
      </section>

      <section className="border-t border-accent/15 bg-[#FFFCFA] py-10">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map(({ icon: Icon, title, sub }) => (
            <div key={title} className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-secondary/40 bg-white shadow-[0_4px_16px_rgba(123,13,43,0.08)]">
                <Icon className="h-7 w-7 text-primary" strokeWidth={1.5} aria-hidden="true" />
              </div>
              <p className="mt-3 text-sm font-bold text-primary">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-foreground/60">{sub}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
