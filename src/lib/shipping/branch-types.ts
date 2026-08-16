export type BranchRecord = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string;
  state: string;
  pincode: string;
  phone: string | null;
  local_shipping_charge: number;
  outstation_shipping_charge: number;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
};

export type BranchServiceAreaRecord = {
  id: string;
  branch_id: string;
  pincode: string;
  is_local: boolean;
};

export type BranchWithAreas = BranchRecord & {
  service_areas: BranchServiceAreaRecord[];
};

export type ShippingTier = "local" | "outstation";

export type BranchShippingResolution = {
  branch: BranchRecord;
  tier: ShippingTier;
  shippingAmount: number;
  matchedPincode: string | null;
  usedDefaultBranch: boolean;
};

export type BranchInput = {
  name: string;
  slug?: string;
  address?: string | null;
  city: string;
  state?: string;
  pincode?: string;
  phone?: string | null;
  local_shipping_charge: number;
  outstation_shipping_charge: number;
  is_active?: boolean;
  is_default?: boolean;
  sort_order?: number;
  service_areas?: { pincode: string; is_local: boolean }[];
};

export function slugifyBranchName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
