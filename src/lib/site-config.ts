function formatIndianMobileDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "").slice(-10);
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export const siteConfig = {
  storeName: "Fashion Point",
  storeNameShort: "Fashion Point",
  tagline: "Style. Confidence. You.",
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://fashionpointvijayawada.com",
  supportEmail: "fashionpoint.store0@gmail.com",
  phone1: "8340973376",
  address:
    "11-49-188, Opp. Lion School, Brahmin St, Mallikarjunapeta, Vijayawada, Andhra Pradesh 520001",
  city: "Vijayawada",
  state: "Andhra Pradesh",
  pincode: "520001",
  whatsappUrl: "https://wa.me/918340973376",
  currency: "INR",
  timezone: "Asia/Kolkata",
  maintenanceMode: false,
  storeDescription:
    "Premium readymade Indian blouses — daily wear, designer & party collections.",
  logoUrl: "",
  seoTitleSuffix: "Premium Ready-Made Indian Blouses",
  seoDescription:
    "Shop premium readymade blouses — daily wear, designer & party collections. AI size finder, saree color matcher & style assistant.",
  seoOgDescription: "Premium readymade Indian blouses with AI-powered shopping"
} as const;

export const STORE_NAME = siteConfig.storeName;
export const STORE_TAGLINE = siteConfig.tagline;

export const STORE_ADDRESS = siteConfig.address;

export const STORE_ADDRESS_SHORT = `${siteConfig.city}, ${siteConfig.state} ${siteConfig.pincode}, India`;

export const STORE_PHONE_PRIMARY = siteConfig.phone1;
/** @deprecated Secondary line removed; alias kept for compatibility. */
export const STORE_PHONE_SECONDARY = siteConfig.phone1;

export const STORE_PHONE_PRIMARY_DISPLAY = formatIndianMobileDisplay(siteConfig.phone1);
/** @deprecated Use STORE_PHONE_PRIMARY_DISPLAY */
export const STORE_PHONE_SECONDARY_DISPLAY = STORE_PHONE_PRIMARY_DISPLAY;

export const STORE_WHATSAPP_URL = siteConfig.whatsappUrl;
export const STORE_TEL_PRIMARY = `tel:+91${STORE_PHONE_PRIMARY}`;
export const STORE_TEL_SECONDARY = STORE_TEL_PRIMARY;

export const SUPPORT_EMAIL = siteConfig.supportEmail;
/** @deprecated Use SUPPORT_EMAIL */
export const STORE_EMAIL = SUPPORT_EMAIL;

export const SITE_URL = siteConfig.siteUrl;

export const STORE_CURRENCY = siteConfig.currency;
export const STORE_TIMEZONE = siteConfig.timezone;
export const STORE_MAINTENANCE_MODE = siteConfig.maintenanceMode;

export const STORE_DESCRIPTION = siteConfig.storeDescription;
export const STORE_LOGO_URL = siteConfig.logoUrl;
export const STORE_SEO_TITLE_SUFFIX = siteConfig.seoTitleSuffix;
export const STORE_SEO_DESCRIPTION = siteConfig.seoDescription;
export const STORE_SEO_OG_DESCRIPTION = siteConfig.seoOgDescription;

export function formatDefaultSeoTitle(storeName: string): string {
  return `${storeName} | ${STORE_SEO_TITLE_SUFFIX}`;
}

export const COPYRIGHT_NOTICE = `© 2026 ${STORE_NAME}. All Rights Reserved.`;
