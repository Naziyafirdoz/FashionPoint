import Image from "next/image";
import { Bot, CreditCard, Gem, PackageX, Shield, type LucideIcon } from "lucide-react";

const USP_STRIP_BG = "/assets/hero/explore-collections-bg.png";

const ICON_BADGE_CLASSNAME =
  "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[1.5px] border-secondary/75 bg-[#FFFCF8] shadow-[0_4px_14px_rgba(184,134,11,0.12)] transition-[transform,box-shadow] duration-[250ms] ease-out hover:-translate-y-[3px] hover:shadow-[0_8px_20px_rgba(184,134,11,0.18)] sm:h-14 sm:w-14";

const ICON_CLASSNAME = "h-9 w-9 text-primary sm:h-11 sm:w-11";

type UspItem = {
  icon: LucideIcon;
  title: string;
  sub?: string;
  subLines?: string[];
};

const ITEMS: UspItem[] = [
  { icon: Shield, title: "PREMIUM QUALITY", sub: "Fine fabrics & finishing" },
  {
    icon: PackageX,
    title: "NO RETURNS",
    subLines: ["No return", "No exchange", "No refund"]
  },
  { icon: Gem, title: "DESIGNER COLLECTIONS", sub: "Curated for every occasion" },
  { icon: CreditCard, title: "100% SECURE PAYMENT", sub: "Razorpay protected" },
  { icon: Bot, title: "AI STYLE ASSISTANT", sub: "Smart recommendations" }
];

export function UspStrip() {
  return (
    <section className="relative w-full overflow-hidden border-y border-accent/20 py-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full bg-[#FFF8F5]"
      >
        <Image
          src={USP_STRIP_BG}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center"
          loading="lazy"
        />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] bg-white/30"
      />
      <div className="relative z-10 mx-auto grid max-w-7xl gap-6 px-4 sm:grid-cols-2 lg:grid-cols-5">
        {ITEMS.map(({ icon: Icon, title, sub, subLines }) => (
          <div key={title} className="flex flex-col items-center text-center">
            <div className={ICON_BADGE_CLASSNAME}>
              <Icon className={ICON_CLASSNAME} aria-hidden="true" />
            </div>
            <p className="mt-2 text-xs font-bold text-primary">{title}</p>
            {subLines ? (
              <div className="text-xs leading-snug text-foreground/60">
                {subLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-foreground/60">{sub}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
