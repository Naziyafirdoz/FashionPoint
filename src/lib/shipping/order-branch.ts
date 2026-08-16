import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase";
import { getShippingSettings } from "@/lib/shipping/settings";

/**
 * Pickup location for an existing order's assigned branch.
 * Shape matches shipment DeliveryAddress so future shipment code can pass it through.
 */
export type OrderBranchPickup = {
  name: string;
  phone: string;
  line: string;
  city: string;
  state: string;
  pincode: string;
};

export type OrderBranchResolution = {
  source: "assigned_branch" | "legacy_fallback";
  branchId: string | null;
  branchName: string | null;
  pickup: OrderBranchPickup;
};

export type OrderBranchInput = {
  branch_id?: string | null;
};

type BranchPickupRow = {
  id: string;
  name: string;
  address: string | null;
  city: string;
  state: string;
  pincode: string;
  phone: string | null;
};

function pickupFromBranchRow(
  branch: BranchPickupRow,
  source: OrderBranchResolution["source"]
): OrderBranchResolution {
  return {
    source,
    branchId: source === "assigned_branch" ? branch.id : null,
    branchName: branch.name,
    pickup: {
      name: "Fashion Point",
      phone: branch.phone ?? "",
      line: branch.address?.trim() ?? "",
      city: branch.city,
      state: branch.state,
      pincode: branch.pincode
    }
  };
}

/**
 * Last-resort pickup when no branch row is available (dev / pre-migration).
 * Live fulfillment origin comes from the assigned or default branch.
 */
function pickupFromStoreSettings(): OrderBranchResolution {
  const settings = getShippingSettings();
  return {
    source: "legacy_fallback",
    branchId: null,
    branchName: null,
    pickup: {
      name: "Fashion Point",
      phone: settings.storePickupPhone,
      line: settings.storePickupAddress,
      city: settings.storePickupCity,
      state: "Andhra Pradesh",
      pincode: settings.storePickupPincode
    }
  };
}

async function loadDefaultBranchPickup(db: SupabaseClient): Promise<BranchPickupRow | null> {
  const { data, error } = await db
    .from("branches")
    .select("id, name, address, city, state, pincode, phone")
    .eq("is_default", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as BranchPickupRow;
}

async function legacyStorePickup(db?: SupabaseClient | null): Promise<OrderBranchResolution> {
  const client = db ?? createServiceClient();
  if (client) {
    const defaultBranch = await loadDefaultBranchPickup(client);
    if (defaultBranch) {
      return pickupFromBranchRow(defaultBranch, "legacy_fallback");
    }
  }
  return pickupFromStoreSettings();
}

function persistedBranchId(branchId: string | null | undefined): string | null {
  const id = branchId?.trim() ?? "";
  if (!id || id.startsWith("legacy-")) return null;
  return id;
}

async function loadBranchPickupById(
  db: SupabaseClient,
  branchId: string
): Promise<BranchPickupRow | null> {
  const { data, error } = await db
    .from("branches")
    .select("id, name, address, city, state, pincode, phone")
    .eq("id", branchId)
    .maybeSingle();

  if (error || !data) return null;
  return data as BranchPickupRow;
}

/**
 * Resolve pickup for an EXISTING order from `order.branch_id`.
 *
 * Does not calculate shipping, quotes, or totals.
 * Does not resolve a branch from the customer's delivery PIN.
 * Does not use the process-local branch cache.
 */
export async function resolveOrderBranch(
  order: OrderBranchInput,
  db?: SupabaseClient | null
): Promise<OrderBranchResolution> {
  const branchId = persistedBranchId(order.branch_id);
  if (!branchId) {
    return legacyStorePickup(db);
  }

  const client = db ?? createServiceClient();
  if (!client) {
    return legacyStorePickup(db);
  }

  const branch = await loadBranchPickupById(client, branchId);
  if (!branch) {
    return legacyStorePickup(client);
  }

  return pickupFromBranchRow(branch, "assigned_branch");
}
