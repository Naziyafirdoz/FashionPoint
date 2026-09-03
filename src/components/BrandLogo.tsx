import { cn } from "@/lib/cn";
import { STORE_NAME } from "@/lib/site-config";
import logoPaths from "../../scripts/logo-paths.json";

export type BrandLogoProps = {
  variant?: "dark" | "light";
  className?: string;
  src?: string;
  alt?: string;
};

const VARIANT_COLORS = {
  dark: {
    body: "#7B0D2B",
    hat: "#B8860B"
  },
  light: {
    body: "#FFFFFF",
    hat: "#F0D080"
  }
} as const;

export function BrandLogo({ variant = "dark", className, src, alt = STORE_NAME }: BrandLogoProps) {
  const colors = VARIANT_COLORS[variant];

  if (src) {
    return (
      // Custom store logos may come from any https host; avoid next/image domain config.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        height={44}
        className={cn("h-[44px] w-auto shrink-0 object-contain", className)}
      />
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={logoPaths.viewBox}
      height={44}
      className={cn("h-[44px] w-auto shrink-0", className)}
      aria-label={alt}
      role="img"
    >
      <path d={logoPaths.bodyPath} fill={colors.body} fillRule="evenodd" />
      <path d={logoPaths.hatPath} fill={colors.hat} fillRule="evenodd" />
    </svg>
  );
}
