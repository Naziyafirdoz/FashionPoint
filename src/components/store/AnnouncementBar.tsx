import Link from "next/link";
import type { ReactNode } from "react";
import { Award, MessageCircle, Phone, Users } from "lucide-react";
import {
  STORE_PHONE_PRIMARY_DISPLAY,
  STORE_TEL_PRIMARY
} from "@/lib/site-config";

const ICON_CLASS =
  "h-4 w-4 shrink-0 text-[#D4AF37] transition-colors duration-200 group-hover:text-[#F0D78C] md:h-[1.125rem] md:w-[1.125rem]";

function SectionSeparator() {
  return (
    <span
      className="hidden h-8 w-px shrink-0 bg-white/25 sm:block"
      aria-hidden="true"
    />
  );
}

type InfoItemProps = {
  icon: ReactNode;
  label: string;
  className?: string;
};

function InfoItem({ icon, label, className = "" }: InfoItemProps) {
  return (
    <div
      className={`group flex min-h-[44px] min-w-0 shrink-0 items-center gap-2 whitespace-nowrap text-white transition-opacity duration-200 hover:opacity-95 sm:min-h-0 ${className}`}
    >
      {icon}
      <span className="text-[11px] font-medium tracking-wide sm:text-xs md:text-sm">{label}</span>
    </div>
  );
}

function IndiaFlagIcon({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center text-base leading-none md:h-[1.125rem] md:w-[1.125rem] md:text-lg ${className ?? ""}`}
      role="img"
      aria-hidden="true"
    >
      🇮🇳
    </span>
  );
}

type AnnouncementPhoneProps = {
  phoneDisplay?: string;
  telUrl?: string;
};

function AnnouncementItems({
  interactive = true,
  phoneDisplay,
  telUrl
}: { interactive?: boolean } & AnnouncementPhoneProps) {
  const phoneClassName =
    "group flex min-h-[44px] min-w-0 shrink-0 items-center gap-2 whitespace-nowrap text-white transition-opacity duration-200 hover:opacity-95 md:min-h-0 md:flex-1 md:justify-center";
  const helpClassName =
    "group flex min-h-[44px] shrink-0 items-center gap-2 rounded-full bg-[#F5F0E8] px-4 py-2 text-[#5C0A20] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#FAF6EF] hover:shadow-md sm:min-h-[36px] md:ml-2";

  const phoneContent = (
    <>
      <Phone className={ICON_CLASS} aria-hidden />
      <span className="text-[11px] font-medium tracking-wide sm:text-xs md:text-sm">
        {phoneDisplay}
      </span>
    </>
  );

  const helpContent = (
    <>
      <MessageCircle
        className="h-4 w-4 shrink-0 text-[#7B0D2B] transition-colors duration-200 group-hover:text-[#9B1428] md:h-[1.125rem] md:w-[1.125rem]"
        aria-hidden
      />
      <span className="text-[11px] font-semibold sm:text-xs md:text-sm">Help</span>
    </>
  );

  return (
    <>
      <InfoItem
        icon={<IndiaFlagIcon />}
        label="Made in India"
        className="md:flex-1 md:justify-center"
      />

      <SectionSeparator />

      <InfoItem
        icon={<Award className={ICON_CLASS} aria-hidden />}
        label="Premium Ready-Made Blouses"
        className="md:flex-1 md:justify-center"
      />

      <SectionSeparator />

      <InfoItem
        icon={<Users className={ICON_CLASS} aria-hidden />}
        label="Trusted by Our Early Customers"
        className="md:flex-1 md:justify-center"
      />

      <SectionSeparator />

      {interactive ? (
        <a
          href={telUrl}
          className={`${phoneClassName} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F0D78C]`}
          aria-label={`Call us at ${phoneDisplay}`}
        >
          {phoneContent}
        </a>
      ) : (
        <span className={phoneClassName}>{phoneContent}</span>
      )}

      <SectionSeparator />

      {interactive ? (
        <Link
          href="/contact"
          className={`${helpClassName} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F0D78C]`}
          aria-label="Get help — contact support"
        >
          {helpContent}
        </Link>
      ) : (
        <span className={helpClassName}>{helpContent}</span>
      )}
    </>
  );
}

const ITEM_GROUP_CLASS =
  "announcement-marquee-group flex min-w-full shrink-0 items-center gap-3 px-3 sm:px-4 md:justify-between md:gap-0";

export function AnnouncementBar({
  phoneDisplay = STORE_PHONE_PRIMARY_DISPLAY,
  telUrl = STORE_TEL_PRIMARY
}: AnnouncementPhoneProps) {
  return (
    <header
      className="relative w-full overflow-hidden border-b border-black/10 bg-gradient-to-r from-[#5C0A20] via-[#7B0D2B] to-[#9B1428] text-white shadow-[0_2px_12px_rgba(91,10,32,0.25)]"
      aria-label="Store highlights and support"
    >
      <div
        className="announcement-marquee-viewport mx-auto flex h-auto min-h-[52px] max-w-7xl items-center overflow-hidden py-2 motion-reduce:overflow-x-auto motion-reduce:[-ms-overflow-style:none] motion-reduce:[scrollbar-width:none] sm:min-h-[56px] md:h-[60px] md:min-h-[60px] md:py-0 motion-reduce:md:overflow-hidden [&::-webkit-scrollbar]:hidden"
      >
        <div className={ITEM_GROUP_CLASS}>
          <AnnouncementItems phoneDisplay={phoneDisplay} telUrl={telUrl} />
        </div>
        <div className={`${ITEM_GROUP_CLASS} announcement-marquee-clone`} aria-hidden="true" inert>
          <AnnouncementItems interactive={false} phoneDisplay={phoneDisplay} telUrl={telUrl} />
        </div>
      </div>
    </header>
  );
}
