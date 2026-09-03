import { getStoreInformation } from "@/lib/settings/store-information";
import { STORE_NAME } from "@/lib/site-config";

/**
 * Sender mailbox only — env/config based.
 * Never store or read the From email address from Store Information DB.
 *
 * TEMP TESTING: defaults to Resend onboarding address until a verified domain is configured.
 * Production: set RESEND_FROM_EMAIL (e.g. orders@your-domain.com).
 */
const RESEND_MAILBOX =
  process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";

function formatFrom(displayName: string): string {
  const name = displayName.trim() || STORE_NAME;
  return `${name} <${RESEND_MAILBOX}>`;
}

async function resolveStoreDisplayName(): Promise<string> {
  const { storeName } = await getStoreInformation();
  return storeName.trim() || STORE_NAME;
}

/** Resend sender for customer order emails (confirmation, shipped). */
export async function getResendFromOrders(): Promise<string> {
  return formatFrom(await resolveStoreDisplayName());
}

/** Resend sender for admin alert emails (new order, packed, etc.). */
export async function getResendFromAlerts(): Promise<string> {
  return formatFrom(await resolveStoreDisplayName());
}

/** Resend sender for stock / store operational alert emails. */
export async function getResendFromAlertsStore(): Promise<string> {
  return formatFrom(await resolveStoreDisplayName());
}

/**
 * Sync Fashion Point template fallbacks for rare non-async paths.
 * Prefer the async getters above so Admin Store Information is used at send time.
 */
export const RESEND_FROM_ORDERS = formatFrom(STORE_NAME);
export const RESEND_FROM_ALERTS = formatFrom(STORE_NAME);
export const RESEND_FROM_ALERTS_STORE = formatFrom(STORE_NAME);
