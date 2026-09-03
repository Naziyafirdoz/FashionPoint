"use client";

import type { HomepageHeroCampaign } from "@/lib/campaigns/homepage-hero-campaign";
import { CampaignHeroContent } from "@/components/store/CampaignHeroContent";

type CampaignHeroArtDirectionProps = {
  campaign: HomepageHeroCampaign;
};

export function CampaignHeroArtDirection({ campaign }: CampaignHeroArtDirectionProps) {
  return <CampaignHeroContent campaign={campaign} ctaAsLink />;
}
