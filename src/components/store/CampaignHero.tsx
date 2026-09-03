import type { HomepageHeroCampaign } from "@/lib/campaigns/homepage-hero-campaign";
import { CampaignHeroArtDirection } from "@/components/store/CampaignHeroArtDirection";

type CampaignHeroProps = {
  campaign: HomepageHeroCampaign;
};

function CampaignHeroImage({ campaign }: { campaign: HomepageHeroCampaign }) {
  const alt = campaign.heading ?? campaign.name;
  const desktopClass = campaign.mobileImageUrl
    ? "campaign-hero-image absolute inset-0 hidden h-full w-full object-cover object-center md:block"
    : "campaign-hero-image absolute inset-0 h-full w-full object-cover object-center";

  const desktop = <img src={campaign.heroImageUrl} alt={alt} className={desktopClass} />;

  if (!campaign.mobileImageUrl) return desktop;

  return (
    <>
      <img
        src={campaign.mobileImageUrl}
        alt={alt}
        className="campaign-hero-image absolute inset-0 h-full w-full object-cover object-center md:hidden"
      />
      {desktop}
    </>
  );
}

export function CampaignHero({ campaign }: CampaignHeroProps) {
  const showContent = campaign.displayMode === "image_with_content";

  return (
    <section
      className="campaign-hero relative w-full overflow-hidden"
      aria-label={campaign.heading ?? campaign.name}
    >
      <div className="campaign-hero-media relative min-h-[22rem] w-full sm:min-h-[28rem] lg:min-h-[34rem]">
        <CampaignHeroImage campaign={campaign} />
        {showContent ? <CampaignHeroArtDirection campaign={campaign} /> : null}
      </div>
    </section>
  );
}
