import { createServiceClient } from "@/lib/supabase";
import type { BranchRecord, BranchServiceAreaRecord, BranchWithAreas } from "@/lib/shipping/branch-types";

let cachedBranches: BranchWithAreas[] | null = null;

function mapBranch(row: Record<string, unknown>, areas: BranchServiceAreaRecord[]): BranchWithAreas {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    address: row.address != null ? String(row.address) : null,
    city: String(row.city),
    state: String(row.state ?? ""),
    pincode: String(row.pincode ?? ""),
    phone: row.phone != null ? String(row.phone) : null,
    local_shipping_charge: Number(row.local_shipping_charge),
    outstation_shipping_charge: Number(row.outstation_shipping_charge),
    is_active: Boolean(row.is_active),
    is_default: Boolean(row.is_default),
    sort_order: Number(row.sort_order ?? 0),
    service_areas: areas
  };
}

export async function loadBranchesFromDb(): Promise<BranchWithAreas[]> {
  const db = createServiceClient();
  if (!db) return [];

  const { data: branchRows, error: branchError } = await db
    .from("branches")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (branchError || !branchRows?.length) {
    return [];
  }

  const branchIds = branchRows.map((r) => String(r.id));
  const { data: areaRows } = await db
    .from("branch_service_areas")
    .select("*")
    .in("branch_id", branchIds);

  const areasByBranch = new Map<string, BranchServiceAreaRecord[]>();
  for (const area of areaRows ?? []) {
    const branchId = String(area.branch_id);
    const list = areasByBranch.get(branchId) ?? [];
    list.push({
      id: String(area.id),
      branch_id: branchId,
      pincode: String(area.pincode),
      is_local: Boolean(area.is_local)
    });
    areasByBranch.set(branchId, list);
  }

  return branchRows.map((row) =>
    mapBranch(row as Record<string, unknown>, areasByBranch.get(String(row.id)) ?? [])
  );
}

export function getCachedBranches(): BranchWithAreas[] {
  return cachedBranches ?? [];
}

export async function hydrateBranches(): Promise<BranchWithAreas[]> {
  const branches = await loadBranchesFromDb();
  cachedBranches = branches;
  return branches;
}

export function resetBranchCache(): void {
  cachedBranches = null;
}

export function setBranchCacheForTests(branches: BranchWithAreas[]): void {
  cachedBranches = branches;
}
