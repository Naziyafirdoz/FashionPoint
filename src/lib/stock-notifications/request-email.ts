import { isValidEmail } from "@/lib/checkout/contact-validation";

/** Raw row shape — supports legacy `email` column if present in older schemas. */
export type StockRequestEmailRow = {
  customer_email?: string | null;
  email?: string | null;
};

/**
 * Resolve the recipient address stored on the notification request itself.
 * Never uses session, auth profile, or any default fallback address.
 */
export function resolveRequestRecipientEmail(row: StockRequestEmailRow): string | null {
  const stored = row.customer_email?.trim() || row.email?.trim() || "";
  if (!stored) return null;

  const normalized = stored.toLowerCase();
  return isValidEmail(normalized) ? normalized : null;
}
