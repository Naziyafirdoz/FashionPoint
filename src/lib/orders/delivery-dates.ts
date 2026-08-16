import type { SupabaseClient } from "@supabase/supabase-js";
import type { Order } from "@/types";
import { createServiceClient } from "@/lib/supabase";
import { resolveShippingZone, type ShippingZone } from "@/lib/shipping/city-detection";
import { normalizePincode } from "@/lib/shipping/pincode-lookup";
import { estimateDeliveryWindow } from "@/lib/shipping/rates";

type OrderEtaInput = Pick<Order, "branch_id" | "shipping_address">;

type BranchServiceAreaRow = {
  pincode: string;
  is_local: boolean;
};

function persistedBranchId(branchId: string | null | undefined): string | null {
  const id = branchId?.trim() ?? "";
  if (!id || id.startsWith("legacy-")) return null;
  return id;
}

function deliveryPincode(address: Order["shipping_address"]): string {
  if (!address) return "";
  return normalizePincode(address.pincode ?? address.postal_code ?? "");
}

function legacyEtaZone(address: Order["shipping_address"]): ShippingZone {
  if (!address) return "outstation";
  return resolveShippingZone(address);
}

async function loadAssignedBranchServiceAreas(
  db: SupabaseClient,
  branchId: string
): Promise<BranchServiceAreaRow[] | null> {
  const { data: branch, error: branchError } = await db
    .from("branches")
    .select("id")
    .eq("id", branchId)
    .maybeSingle();

  if (branchError || !branch) return null;

  const { data: areas, error: areaError } = await db
    .from("branch_service_areas")
    .select("pincode, is_local")
    .eq("branch_id", branchId);

  if (areaError) return null;

  return (areas ?? []).map((area) => ({
    pincode: String(area.pincode),
    is_local: Boolean(area.is_local)
  }));
}

/**
 * Existing-order ETA zone from persisted `order.branch_id` and THAT branch's
 * service areas only. Does not reassign a branch from the delivery PIN.
 * Does not calculate shipping amounts.
 */
export async function resolveOrderEtaZone(
  order: OrderEtaInput,
  db?: SupabaseClient | null
): Promise<ShippingZone> {
  const branchId = persistedBranchId(order.branch_id);
  if (!branchId) {
    return legacyEtaZone(order.shipping_address);
  }

  const client = db ?? createServiceClient();
  if (!client) {
    return legacyEtaZone(order.shipping_address);
  }

  const areas = await loadAssignedBranchServiceAreas(client, branchId);
  if (!areas) {
    return legacyEtaZone(order.shipping_address);
  }

  const pincode = deliveryPincode(order.shipping_address);
  if (pincode.length === 6) {
    const match = areas.find((area) => area.pincode === pincode);
    if (match) {
      return match.is_local ? "local" : "outstation";
    }
  }

  return "outstation";
}

function addBusinessDays(start: Date, businessDays: number): Date {
  const result = new Date(start);
  let added = 0;
  while (added < businessDays) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

export function computeEstimatedDeliveryDate(orderDate: Date = new Date(), zone?: "local" | "outstation"): string {
  const window = estimateDeliveryWindow(zone ?? "outstation");
  return addBusinessDays(orderDate, window.maxDays).toISOString().slice(0, 10);
}

export function resolveExpectedDeliveryDate(order: Order): string | null {
  if (order.estimated_delivery_date) {
    return order.estimated_delivery_date;
  }
  if (order.preferred_delivery_date) {
    return order.preferred_delivery_date;
  }

  const zone = order.shipping_address
    ? resolveShippingZone(order.shipping_address)
    : "outstation";

  const etaZone = zone === "outskirts" ? "outstation" : (zone as "local" | "outstation");
  return computeEstimatedDeliveryDate(new Date(order.created_at), etaZone);
}

export function formatDeliveryDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}
