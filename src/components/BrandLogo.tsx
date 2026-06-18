import { cn } from "@/lib/cn";
import logoPaths from "../../scripts/logo-paths.json";

export type BrandLogoProps = {
  variant?: "dark" | "light";
  className?: string;
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

export function BrandLogo({ variant = "dark", className }: BrandLogoProps) {
  const colors = VARIANT_COLORS[variant];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={logoPaths.viewBox}
      height={44}
      className={cn("h-[44px] w-auto shrink-0", className)}
      aria-label="Fashion Point"
      role="img"
    >
      <path d={logoPaths.bodyPath} fill={colors.body} fillRule="evenodd" />
      <path d={logoPaths.hatPath} fill={colors.hat} fillRule="evenodd" />
    </svg>
  );
}
