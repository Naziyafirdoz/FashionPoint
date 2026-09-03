import Link from "next/link";
import { BrandLogo, type BrandLogoProps } from "@/components/BrandLogo";
import { cn } from "@/lib/cn";
import type { StoreBrandAlign } from "@/lib/settings/store-branding";
import { STORE_NAME, STORE_TAGLINE } from "@/lib/site-config";

export type BrandLockupProps = {
  variant?: BrandLogoProps["variant"];
  className?: string;
  /** Hide tagline below md (navbar mobile). Footer should pass false. */
  compactOnMobile?: boolean;
  storeName?: string;
  tagline?: string;
  logoUrl?: string;
  align?: StoreBrandAlign;
};

export function BrandLockup({
  variant = "dark",
  className,
  compactOnMobile = true,
  storeName = STORE_NAME,
  tagline = STORE_TAGLINE,
  logoUrl,
  align = "left"
}: BrandLockupProps) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex shrink-0 items-center gap-3",
        align === "center" && "flex-col text-center",
        className
      )}
      aria-label={storeName}
    >
      <BrandLogo variant={variant} src={logoUrl || undefined} alt={storeName} />
      <div className="flex flex-col leading-tight">
        <span className="font-display text-2xl font-bold text-primary md:text-[28px] lg:text-[30px]">
          {storeName}
        </span>
        <span
          className={cn(
            "text-xs font-normal text-[#777777]",
            compactOnMobile && "hidden md:block"
          )}
        >
          {tagline}
        </span>
      </div>
    </Link>
  );
}
