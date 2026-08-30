"use client";

import type { CSSProperties, ReactNode } from "react";
import { usePathname } from "next/navigation";

function isCheckoutPath(pathname: string): boolean {
  return pathname === "/checkout" || pathname.startsWith("/checkout/");
}

type StorefrontBrandingScopeProps = {
  displayFont?: string;
  children: ReactNode;
};

export function StorefrontBrandingScope({ displayFont, children }: StorefrontBrandingScopeProps) {
  const pathname = usePathname();
  const applyBrandingFont = Boolean(displayFont) && !isCheckoutPath(pathname);
  const style = applyBrandingFont
    ? ({ ["--font-display"]: displayFont } as CSSProperties)
    : undefined;

  return <div style={style}>{children}</div>;
}
