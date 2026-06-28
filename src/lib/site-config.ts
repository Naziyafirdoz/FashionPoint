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
  supportEmail: "fashionpointvza@gmail.com",
  phone1: "8340973376",
  address:
    "11-49-188, Opp. Lion School, Brahmin St, Mallikarjunapeta, Vijayawada, Andhra Pradesh 520001",
  city: "Vijayawada",
  state: "Andhra Pradesh",
  pincode: "520001",
  whatsappUrl: "https://wa.me/918340973376",
  currency: "INR",
  timezone: "Asia/Kolkata",
  maintenanceMode: false
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

export const COPYRIGHT_NOTICE = `© 2026 ${STORE_NAME}. All Rights Reserved.`;
