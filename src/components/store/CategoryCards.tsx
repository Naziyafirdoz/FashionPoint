import Link from "next/link";
import Image from "next/image";
import { CATEGORIES } from "@/lib/mock-data";

const TONES: Record<string, string> = {
  "daily-wear": "from-pink-100 to-pink-50",
  "designer-wear": "from-amber-50 to-green-50",
  "party-wear": "from-purple-100 to-purple-50",
  soon: "from-teal-100 to-teal-50"
};

export function CategoryCards() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES.map((cat) => (
          <div
            key={cat.id}
            className={`card-store relative overflow-hidden bg-gradient-to-br ${TONES[cat.slug] ?? "from-blush to-white"}`}
          >
            <div className="relative z-10 pr-24">
              <h3 className="font-display text-lg font-bold text-primary">{cat.name}</h3>
              <p className="mt-2 text-sm text-foreground/70">{cat.description}</p>
              <Link
                href={cat.slug === "soon" ? "/soon" : `/${cat.slug}`}
                className="btn-outline mt-4 inline-flex text-xs"
              >
                {cat.slug === "soon" ? "STAY TUNED" : "EXPLORE NOW"}
              </Link>
            </div>
            {cat.image_url && (
              <div className="absolute bottom-0 right-0 h-28 w-28">
                <Image src={cat.image_url} alt={cat.name} fill className="object-cover rounded-tl-2xl" />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
