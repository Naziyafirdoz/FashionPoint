import { STORE_NAME } from "@/lib/site-config";

// TEMP TESTING CONFIG - REPLACE WITH VERIFIED DOMAIN EMAIL BEFORE PRODUCTION
/** Resend sender for customer order emails (confirmation, shipped). */
export const RESEND_FROM_ORDERS = `${STORE_NAME} <onboarding@resend.dev>`;
// Production: `${STORE_NAME} <orders@fashionpointvijayawada.com>`

/** Resend sender for admin alert emails (new order, packed, etc.). */
export const RESEND_FROM_ALERTS = `Fashion Point <onboarding@resend.dev>`;
// Production: `Fashion Point <alerts@fashionpointvijayawada.com>`

/** Resend sender for low-stock admin alerts (uses store name). */
export const RESEND_FROM_ALERTS_STORE = `${STORE_NAME} <onboarding@resend.dev>`;
// Production: `${STORE_NAME} <alerts@fashionpointvijayawada.com>`
