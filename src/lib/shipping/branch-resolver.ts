import { locationNamesMatch, normalizePincode } from "@/lib/shipping/pincode-lookup";
import { getCachedBranches } from "@/lib/shipping/branch-store";
import type {
  BranchRecord,
  BranchShippingResolution,
  BranchWithAreas,
  ShippingTier
} from "@/lib/shipping/branch-types";
import type { ShippingAddressInput } from "@/lib/shipping/city-detection";

/** Fallback when DB branches are unavailable (dev / pre-migration). */
export function legacyFallbackBranches(): BranchWithAreas[] {
  return [
    {
      id: "legacy-vijayawada",
      name: "Vijayawada",
      slug: "vijayawada",
      address: null,
      city: "Vijayawada",
      state: "Andhra Pradesh",
      pincode: "520001",
      phone: null,
      local_shipping_charge: 99,
      outstation_shipping_charge: 199,
      is_active: true,
      is_default: true,
      sort_order: 0,
      service_areas: [
        "520001",
        "520002",
        "520003",
        "520004",
        "520005",
        "520006",
        "520007",
        "520008",
        "520009",
        "520010",
        "520011",
        "520012",
        "520013",
        "520014",
        "520015",
        "520016"
      ].map((pincode, index) => ({
        id: `legacy-${pincode}`,
        branch_id: "legacy-vijayawada",
        pincode,
        is_local: true
      }))
    }
  ];
}

function activeBranches(): BranchWithAreas[] {
  const loaded = getCachedBranches().filter((b) => b.is_active);
  return loaded.length ? loaded : legacyFallbackBranches();
}

function defaultBranch(branches: BranchWithAreas[]): BranchWithAreas {
  return branches.find((b) => b.is_default) ?? branches[0];
}

function chargeForTier(branch: BranchRecord, tier: ShippingTier): number {
  return tier === "local" ? branch.local_shipping_charge : branch.outstation_shipping_charge;
}

function eligibleBranches(branches: BranchWithAreas[]): BranchWithAreas[] {
  const active = branches.filter((branch) => branch.is_active);
  return active.length ? active : branches;
}

function hasLocalServicePin(branch: BranchWithAreas, pincode: string): boolean {
  return branch.service_areas.some((area) => area.pincode === pincode && area.is_local);
}

function rateTierForBranch(branch: BranchWithAreas, pincode: string): ShippingTier {
  return pincode.length === 6 && hasLocalServicePin(branch, pincode) ? "local" : "outstation";
}

function resolutionFor(
  branch: BranchWithAreas,
  pincode: string,
  usedDefaultBranch: boolean
): BranchShippingResolution {
  const tier = rateTierForBranch(branch, pincode);
  return {
    branch,
    tier,
    shippingAmount: chargeForTier(branch, tier),
    matchedPincode: pincode.length === 6 ? pincode : null,
    usedDefaultBranch
  };
}

function branchMatchesAddressCity(
  branch: BranchWithAreas,
  address: ShippingAddressInput
): boolean {
  const city = address.city?.trim() ?? "";
  if (!city || !branch.city.trim()) return false;
  if (!locationNamesMatch(city, branch.city)) return false;

  const state = address.state?.trim() ?? "";
  const branchState = branch.state?.trim() ?? "";
  if (state && branchState && !locationNamesMatch(state, branchState)) return false;
  return true;
}

export function resolveBranchShipping(
  address: ShippingAddressInput,
  branchesInput?: BranchWithAreas[]
): BranchShippingResolution {
  const branches = eligibleBranches(branchesInput ?? activeBranches());
  const fallback = defaultBranch(branches);
  const pincode = normalizePincode(address.pincode ?? "");

  if (pincode.length === 6) {
    const localBranch = branches.find((branch) => hasLocalServicePin(branch, pincode));
    if (localBranch) {
      return resolutionFor(localBranch, pincode, false);
    }
  }

  const cityBranch = branches.find((branch) => branchMatchesAddressCity(branch, address));
  if (cityBranch) {
    return resolutionFor(cityBranch, pincode, false);
  }

  return resolutionFor(fallback, pincode, true);
}

export function findBranchById(branchId: string | null | undefined): BranchWithAreas | null {
  if (!branchId) return null;
  return getCachedBranches().find((b) => b.id === branchId) ?? null;
}
