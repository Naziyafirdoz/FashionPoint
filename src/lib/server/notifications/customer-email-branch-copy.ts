import { createServiceClient } from "@/lib/supabase/admin";

export type CustomerEmailBranchCopy = {
  thankYou: string;
  locationLine: string;
};

export const GENERIC_CUSTOMER_EMAIL_BRANCH_COPY: CustomerEmailBranchCopy = {
  thankYou: "❤️ Thank you for shopping with Fashion Point ❤️",
  locationLine: "Fashion Point"
};

function persistedBranchId(branchId: string | null | undefined): string | null {
  const id = branchId?.trim() ?? "";
  if (!id || id.startsWith("legacy-")) return null;
  return id;
}

function normalizeIdentity(value: string): string {
  return value.trim().toLowerCase();
}

function identityKeys(slug: string, name: string, city: string): string[] {
  return [slug, name, city].map(normalizeIdentity).filter(Boolean);
}

function isBangaloreBranch(slug: string, name: string, city: string): boolean {
  return identityKeys(slug, name, city).some(
    (key) => key === "bangalore" || key === "bengaluru"
  );
}

function isVijayawadaBranch(slug: string, name: string, city: string): boolean {
  return identityKeys(slug, name, city).some((key) => key === "vijayawada");
}

function copyForPersistedBranch(slug: string, name: string, city: string): CustomerEmailBranchCopy {
  if (isBangaloreBranch(slug, name, city)) {
    return {
      thankYou: "❤️ Thank you for shopping with Fashion Point Bangalore ❤️",
      locationLine: "Fashion Point • Bangalore"
    };
  }
  if (isVijayawadaBranch(slug, name, city)) {
    return {
      thankYou: "❤️ Thank you for shopping with Fashion Point Vijayawada ❤️",
      locationLine: "Fashion Point • Vijayawada"
    };
  }
  return GENERIC_CUSTOMER_EMAIL_BRANCH_COPY;
}

/**
 * Email display copy from the order's already-persisted branch_id.
 * Does not select a branch, quote shipping, or inspect the delivery address.
 */
export async function resolveCustomerEmailBranchCopy(
  branchId: string | null | undefined
): Promise<CustomerEmailBranchCopy> {
  const id = persistedBranchId(branchId);
  if (!id) return GENERIC_CUSTOMER_EMAIL_BRANCH_COPY;

  const db = createServiceClient();
  if (!db) return GENERIC_CUSTOMER_EMAIL_BRANCH_COPY;

  const { data, error } = await db
    .from("branches")
    .select("name, slug, city")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return GENERIC_CUSTOMER_EMAIL_BRANCH_COPY;

  return copyForPersistedBranch(
    String(data.slug ?? ""),
    String(data.name ?? ""),
    String(data.city ?? "")
  );
}
