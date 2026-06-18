import Link from "next/link";
import { BrandLogo as BrandLogoMark, type BrandLogoProps } from "@/components/BrandLogo";
import { STORE_NAME } from "@/lib/site-config";

type StoreBrandLogoProps = BrandLogoProps & {
  href?: string;
};

export function BrandLogo({ href = "/", variant = "dark", className }: StoreBrandLogoProps) {
  const logo = <BrandLogoMark variant={variant} className={className} />;

  if (href) {
    return (
      <Link href={href} className="inline-block shrink-0" aria-label={STORE_NAME}>
        {logo}
      </Link>
    );
  }

  return logo;
}
