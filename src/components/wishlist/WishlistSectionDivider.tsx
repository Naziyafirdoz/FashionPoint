import Image from "next/image";

const DIVIDER = "/assets/hero/explore-collections-divider.png";

export function WishlistSectionDivider() {
  return (
    <Image
      src={DIVIDER}
      alt=""
      width={267}
      height={40}
      aria-hidden
      sizes="267px"
      className="mx-auto mt-3 block h-auto w-auto max-w-[min(100%,267px)]"
    />
  );
}
