"use client";

import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { cn } from "@/lib/cn";
import {
  resolvePreviewFontStack,
  type StoreBranding
} from "@/lib/settings/store-branding";

type BrandingPreviewProps = {
  storeName: string;
  tagline: string;
  logoUrl: string;
  branding: StoreBranding;
};

export function BrandingPreview({ storeName, tagline, logoUrl, branding }: BrandingPreviewProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const fontFamily = resolvePreviewFontStack(branding.fontFamily);
  const alignCenter = branding.brandAlign === "center";
  const showCustomLogo = Boolean(logoUrl) && !logoFailed;

  useEffect(() => {
    setLogoFailed(false);
  }, [logoUrl]);

  return (
    <div
      className="rounded-xl border border-accent/20 bg-[#fff5f7] p-4"
      style={{ fontFamily, color: branding.bodyTextColor }}
    >
      <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-foreground/45">
        Live preview
      </p>
      <div className={cn("flex gap-3", alignCenter ? "flex-col items-center text-center" : "items-center")}>
        {showCustomLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={storeName}
            height={44}
            className="h-[44px] w-auto shrink-0 object-contain"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <BrandLogo variant="dark" alt={storeName} />
        )}
        <div className={cn("flex flex-col leading-tight", alignCenter && "items-center")}>
          <span className="text-2xl font-bold" style={{ color: branding.headingColor, fontFamily }}>
            {storeName}
          </span>
          <span className="text-xs" style={{ color: branding.bodyTextColor }}>
            {tagline}
          </span>
        </div>
      </div>
      {logoFailed ? (
        <p className="mt-2 text-xs text-red-600">Logo URL could not be loaded. The Fashion Point logo is shown instead.</p>
      ) : null}
      <h3 className="mt-4 text-lg font-bold" style={{ color: branding.headingColor, fontFamily }}>
        Sample heading
      </h3>
      <p className="mt-1 text-sm leading-relaxed" style={{ color: branding.bodyTextColor }}>
        Body text uses the selected body color. Heading font is used for the store name and this heading.
      </p>
      <div className={cn("mt-4 flex flex-wrap items-center gap-2", alignCenter && "justify-center")}>
        <span
          className="inline-flex rounded-full px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: branding.primaryColor }}
        >
          Primary button
        </span>
        <span className="text-sm font-medium" style={{ color: branding.secondaryColor }}>
          Secondary accent
        </span>
      </div>
    </div>
  );
}
