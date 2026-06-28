import Image from "next/image";

const HERO_ORIGINAL_BG = "/assets/hero/original-bg.png";

export function TrendingNowSectionBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
      <Image
        src={HERO_ORIGINAL_BG}
        alt=""
        fill
        className="object-cover object-center"
        sizes="100vw"
        loading="lazy"
      />
    </div>
  );
}
