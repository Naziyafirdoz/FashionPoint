export const siteConfig = {
  storeName: "Fashion Point",
  storeNameShort: "Fashion Point",
  tagline: "Style. Confidence. You.",
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://fashionpointvijayawada.com",
  supportEmail: "support@fashionpointvijayawada.com",
  phone1: "9885831786",
  phone2: "8340973376",
  address:
    "Ratham Center, 10-19-19, 1 Town, Durga Agraharam, Mallikarjunapeta, Vijayawada, Andhra Pradesh 520001",
  city: "Vijayawada",
  whatsappUrl: "https://wa.me/919885831786"
} as const;

export const STORE_NAME = siteConfig.storeName;
export const STORE_TAGLINE = siteConfig.tagline;

export const STORE_ADDRESS = siteConfig.address;

export const STORE_ADDRESS_SHORT = `${siteConfig.city}, Andhra Pradesh 520001, India`;

export const STORE_PHONE_PRIMARY = siteConfig.phone1;
export const STORE_PHONE_SECONDARY = siteConfig.phone2;

export const STORE_PHONE_PRIMARY_DISPLAY = "+91 98858 31786";
export const STORE_PHONE_SECONDARY_DISPLAY = "+91 83409 73376";

export const STORE_WHATSAPP_URL = siteConfig.whatsappUrl;
export const STORE_TEL_PRIMARY = `tel:+91${STORE_PHONE_PRIMARY}`;
export const STORE_TEL_SECONDARY = `tel:+91${STORE_PHONE_SECONDARY}`;

export const SUPPORT_EMAIL = siteConfig.supportEmail;
/** @deprecated Use SUPPORT_EMAIL */
export const STORE_EMAIL = SUPPORT_EMAIL;

export const SITE_URL = siteConfig.siteUrl;

export const COPYRIGHT_NOTICE = `© 2026 ${STORE_NAME}. All Rights Reserved.`;
