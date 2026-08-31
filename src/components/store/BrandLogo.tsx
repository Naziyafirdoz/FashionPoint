import Link from "next/link";
import { BrandLogo as BrandLogoMark, type BrandLogoProps } from "@/components/BrandLogo";
import { STORE_NAME } from "@/lib/site-config";

type StoreBrandLogoProps = BrandLogoProps & {
  href?: string;
  storeName?: string;
};

export function BrandLogo({
  href = "/",
  variant = "dark",
  className,
  storeName = STORE_NAME
}: StoreBrandLogoProps) {
  const logo = <BrandLogoMark variant={variant} className={className} alt={storeName} />;

  if (href) {
    return (
      <Link href={href} className="inline-block shrink-0" aria-label={storeName}>
        {logo}
      </Link>
    );
  }

  return logo;
}
