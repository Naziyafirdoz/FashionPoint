import { getStoreInformation } from "@/lib/settings/store-information";
import { STORE_NAME } from "@/lib/site-config";
import { createServiceClient } from "@/lib/supabase/admin";

export type CustomerEmailBranchCopy = {
  thankYou: string;
  locationLine: string;
};

export function buildCustomerEmailBranchCopy(
  storeName: string,
  city?: string | null
): CustomerEmailBranchCopy {
  const name = storeName.trim() || STORE_NAME;
  const location = city?.trim() ?? "";
  return {
    thankYou: location
      ? `❤️ Thank you for shopping with ${name} ${location} ❤️`
      : `❤️ Thank you for shopping with ${name} ❤️`,
    locationLine: location ? `${name} • ${location}` : name
  };
}

/** Fashion Point default when store information has not been loaded yet. */
export const GENERIC_CUSTOMER_EMAIL_BRANCH_COPY = buildCustomerEmailBranchCopy(STORE_NAME);

function persistedBranchId(branchId: string | null | undefined): string | null {
  const id = branchId?.trim() ?? "";
  if (!id || id.startsWith("legacy-")) return null;
  return id;
}

/**
 * Email display copy from store information plus the order's persisted branch city.
 * Does not select a branch, quote shipping, or inspect the delivery address.
 */
export async function resolveCustomerEmailBranchCopy(
  branchId: string | null | undefined
): Promise<CustomerEmailBranchCopy> {
  const { storeName } = await getStoreInformation();
  const id = persistedBranchId(branchId);
  if (!id) return buildCustomerEmailBranchCopy(storeName);

  const db = createServiceClient();
  if (!db) return buildCustomerEmailBranchCopy(storeName);

  const { data, error } = await db
    .from("branches")
    .select("city")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return buildCustomerEmailBranchCopy(storeName);

  return buildCustomerEmailBranchCopy(storeName, String(data.city ?? ""));
}
