"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import type { CampaignContentStyle } from "@/lib/campaigns/campaign-hero-content-style";
import { contentStyleToCssVars } from "@/lib/campaigns/campaign-hero-content-style";
import { isSafeInternalCtaUrl } from "@/lib/campaigns/homepage-hero-campaign";
import { tokensToCssVars } from "@/lib/campaigns/campaign-hero-palette";
import { useCampaignHeroPalette } from "@/components/store/useCampaignHeroPalette";

export type CampaignHeroContentModel = {
  heading: string | null;
  subheading: string | null;
  offerText: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  heroImageUrl: string;
  mobileImageUrl: string | null;
  contentStyle: CampaignContentStyle | null;
};

type CampaignHeroContentProps = {
  campaign: CampaignHeroContentModel;
  ctaAsLink?: boolean;
  compact?: boolean;
};

export function CampaignHeroContent({
  campaign,
  ctaAsLink = true,
  compact = false
}: CampaignHeroContentProps) {
  const savedStyle = campaign.contentStyle;
  const paletteTokens = useCampaignHeroPalette(
    campaign.heroImageUrl,
    campaign.mobileImageUrl,
    !savedStyle
  );
  const cssVars = savedStyle ? contentStyleToCssVars(savedStyle) : tokensToCssVars(paletteTokens);
  const align = savedStyle?.layout.horizontalAlign ?? "left";
  const ctaUrl = campaign.ctaUrl && isSafeInternalCtaUrl(campaign.ctaUrl) ? campaign.ctaUrl : null;
  const showCta = Boolean(campaign.ctaText && (ctaAsLink ? ctaUrl : campaign.ctaText));
  const custom = Boolean(savedStyle);

  const ctaClassName =
    "campaign-hero-cta mt-6 inline-flex items-center justify-center rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] sm:text-sm";

  return (
    <div
      className={`campaign-hero-art absolute inset-0 z-[1]${custom ? " campaign-hero-art--custom" : ""}`}
      data-align={align}
      style={cssVars as CSSProperties}
    >
      <div className="campaign-hero-scrim pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="campaign-hero-content absolute inset-0 flex items-end">
        <div
          className={`relative mx-auto flex w-full max-w-7xl px-4 pt-24 sm:px-6 ${
            compact ? "pb-8" : "pb-10 sm:pb-14 lg:pb-16"
          } ${
            align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`campaign-hero-copy relative max-w-xl ${
              align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
            }`}
          >
            <div
              className={`campaign-hero-copy-veil pointer-events-none absolute -bottom-4 -top-8 sm:-inset-y-4 ${
                align === "center"
                  ? "-inset-x-4 sm:-inset-x-6"
                  : align === "right"
                    ? "-right-4 left-0 sm:-right-6"
                    : "-left-4 right-0 sm:-left-6"
              }`}
              aria-hidden="true"
            />
            <div className="relative">
              <span className="campaign-hero-accent-rule mb-4 block h-[2px] w-11 rounded-full" aria-hidden="true" />
              {campaign.offerText ? (
                <p
                  className={
                    custom
                      ? "campaign-hero-offer mb-3 font-semibold uppercase tracking-[0.22em]"
                      : "campaign-hero-offer mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.22em] sm:text-xs"
                  }
                >
                  {campaign.offerText}
                </p>
              ) : null}
              {campaign.heading ? (
                <h1
                  className={
                    custom
                      ? "campaign-hero-heading tracking-tight"
                      : "campaign-hero-heading font-display text-3xl font-semibold leading-[1.08] tracking-tight sm:text-4xl lg:text-5xl xl:text-[3.35rem]"
                  }
                >
                  {campaign.heading}
                </h1>
              ) : null}
              {campaign.subheading ? (
                <p
                  className={
                    custom
                      ? "campaign-hero-subheading mt-3 max-w-xl leading-relaxed"
                      : "campaign-hero-subheading mt-3 max-w-xl font-sans text-sm leading-relaxed sm:text-base"
                  }
                >
                  {campaign.subheading}
                </p>
              ) : null}
              {showCta ? (
                ctaAsLink && ctaUrl ? (
                  <Link href={ctaUrl} className={ctaClassName}>
                    {campaign.ctaText}
                  </Link>
                ) : (
                  <span className={ctaClassName}>{campaign.ctaText}</span>
                )
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
