"use client";

import type { CSSProperties, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DEFAULT_STORE_BRANDING, hexColorToRgbChannels, normalizeHexColor } from "@/lib/settings/store-branding";

function isCheckoutPath(pathname: string): boolean {
  return pathname === "/checkout" || pathname.startsWith("/checkout/");
}

function resolvedHex(value: string | undefined, fallback: string): string {
  return normalizeHexColor(value ?? "") ?? fallback;
}

function assignColor(
  target: Record<string, string>,
  cssName: "--primary" | "--secondary" | "--foreground" | "--heading",
  hex: string
) {
  target[cssName] = hex;
  if (cssName === "--heading") return;
  const rgb = hexColorToRgbChannels(hex);
  if (rgb) target[`${cssName}-rgb`] = rgb;
}

type StorefrontBrandingScopeProps = {
  displayFont?: string;
  primaryColor?: string;
  secondaryColor?: string;
  headingColor?: string;
  bodyTextColor?: string;
  children: ReactNode;
};

export function StorefrontBrandingScope({
  displayFont,
  primaryColor,
  secondaryColor,
  headingColor,
  bodyTextColor,
  children
}: StorefrontBrandingScopeProps) {
  const pathname = usePathname();
  const skipCheckoutBranding = isCheckoutPath(pathname);

  let style: CSSProperties | undefined;
  if (!skipCheckoutBranding) {
    const vars: Record<string, string> = {};
    if (displayFont) vars["--font-display"] = displayFont;
    assignColor(vars, "--primary", resolvedHex(primaryColor, DEFAULT_STORE_BRANDING.primaryColor));
    assignColor(vars, "--secondary", resolvedHex(secondaryColor, DEFAULT_STORE_BRANDING.secondaryColor));
    assignColor(vars, "--foreground", resolvedHex(bodyTextColor, DEFAULT_STORE_BRANDING.bodyTextColor));
    assignColor(vars, "--heading", resolvedHex(headingColor, DEFAULT_STORE_BRANDING.headingColor));
    style = vars as CSSProperties;
  }

  return <div style={style}>{children}</div>;
}
