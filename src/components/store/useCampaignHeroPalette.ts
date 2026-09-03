"use client";

import { useEffect, useState } from "react";
import {
  FALLBACK_CAMPAIGN_HERO_TOKENS,
  tokensFromImageData,
  type CampaignHeroStyleTokens
} from "@/lib/campaigns/campaign-hero-palette";

const paletteCache = new Map<string, CampaignHeroStyleTokens>();
const MD_QUERY = "(min-width: 768px)";

export type CampaignHeroPaletteResult =
  | { ok: true; tokens: CampaignHeroStyleTokens }
  | { ok: false; reason: "load" | "cors" };

export function sampleCampaignHeroImage(url: string): Promise<CampaignHeroPaletteResult> {
  const cached = paletteCache.get(url);
  if (cached) return Promise.resolve({ ok: true, tokens: cached });

  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";

    const finishOk = (tokens: CampaignHeroStyleTokens) => {
      paletteCache.set(url, tokens);
      if (paletteCache.size > 24) {
        const first = paletteCache.keys().next().value;
        if (first) paletteCache.delete(first);
      }
      resolve({ ok: true, tokens });
    };

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const width = 48;
        const height = 48;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx || !image.width || !image.height) {
          resolve({ ok: false, reason: "cors" });
          return;
        }
        ctx.drawImage(image, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        finishOk(tokensFromImageData(imageData));
      } catch {
        resolve({ ok: false, reason: "cors" });
      }
    };
    image.onerror = () => resolve({ ok: false, reason: "load" });
    image.src = url;
  });
}

export function useCampaignHeroPalette(
  desktopUrl: string,
  mobileUrl: string | null,
  enabled = true
) {
  const [tokens, setTokens] = useState(FALLBACK_CAMPAIGN_HERO_TOKENS);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const analyze = () => {
      const desktop = typeof window !== "undefined" && window.matchMedia(MD_QUERY).matches;
      const url = desktop || !mobileUrl ? desktopUrl : mobileUrl;
      void sampleCampaignHeroImage(url).then((result) => {
        if (cancelled) return;
        setTokens(result.ok ? result.tokens : FALLBACK_CAMPAIGN_HERO_TOKENS);
      });
    };

    analyze();
    const media = window.matchMedia(MD_QUERY);
    const onChange = () => analyze();
    media.addEventListener("change", onChange);
    return () => {
      cancelled = true;
      media.removeEventListener("change", onChange);
    };
  }, [desktopUrl, mobileUrl, enabled]);

  return tokens;
}
