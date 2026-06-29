import Image from "next/image";

export const EXPLORE_COLLECTIONS_BG = "/assets/hero/explore-collections-bg.png";

export function ExploreCollectionsSectionBackground({ subtle = false }: { subtle?: boolean }) {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full bg-[#FFF8F5]"
      >
        <Image
          src={EXPLORE_COLLECTIONS_BG}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center"
          loading="lazy"
        />
      </div>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-[1] ${subtle ? "bg-white/40" : "bg-white/30"}`}
      />
    </>
  );
}
