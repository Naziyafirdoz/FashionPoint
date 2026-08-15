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

/**
 * Existing shipment pickup used when an order has no persisted branch.
 * Mirrors `storePickupAddress()` in shipment-service.ts — do not change that behavior here.
 */
function legacyStorePickup(): OrderBranchResolution {
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
    return legacyStorePickup();
  }

  const client = db ?? createServiceClient();
  if (!client) {
    return legacyStorePickup();
  }

  const branch = await loadBranchPickupById(client, branchId);
  if (!branch) {
    return legacyStorePickup();
  }

  return {
    source: "assigned_branch",
    branchId: branch.id,
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
