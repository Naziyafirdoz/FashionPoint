import { getActiveHomepageHeroCampaign } from "@/lib/campaigns/homepage-hero-campaigns";
import { CampaignHero } from "@/components/store/CampaignHero";
import { HeroBanner } from "@/components/store/HeroBanner";

export async function HomeHeroSlot() {
  let campaign = null;

  try {
    campaign = await getActiveHomepageHeroCampaign();
  } catch {
    campaign = null;
  }

  if (campaign) {
    return <CampaignHero campaign={campaign} />;
  }

  return <HeroBanner />;
}
