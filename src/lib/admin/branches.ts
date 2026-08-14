import type { SupabaseClient } from "@supabase/supabase-js";
import type { BranchRecord, BranchServiceAreaRecord, BranchWithAreas } from "@/lib/shipping/branch-types";

export type AdminBranchRow = BranchRecord & {
  service_area_count: number;
  used_in_orders: boolean;
};

export type BranchUpsertInput = {
  name: string;
  slug: string;
  city: string;
  state?: string;
  pincode?: string;
  address?: string | null;
  phone?: string | null;
  local_shipping_charge: number;
  outstation_shipping_charge: number;
  is_active?: boolean;
  is_default?: boolean;
  sort_order?: number;
};

/**
 * Validate branch name.
 * Returns error message or null if valid.
 */
export function validateBranchName(name: string | unknown): string | null {
  if (typeof name !== "string") return "Branch name is required";
  const trimmed = name.trim();
  if (!trimmed) return "Branch name is required";
  if (trimmed.length > 100) return "Branch name must not exceed 100 characters";
  return null;
}

/**
 * Validate branch slug format.
 * Returns error message or null if valid.
 */
export function validateBranchSlug(slug: string | unknown): string | null {
  if (typeof slug !== "string") return "Branch slug is required";
  const trimmed = slug.trim().toLowerCase();
  if (!trimmed) return "Branch slug is required";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmed)) {
    return "Slug must be lowercase alphanumeric with hyphens only";
  }
  if (trimmed.length > 50) return "Slug must not exceed 50 characters";
  return null;
}

/**
 * Validate city name.
 * Returns error message or null if valid.
 */
export function validateBranchCity(city: string | unknown): string | null {
  if (typeof city !== "string") return "City is required";
  const trimmed = city.trim();
  if (!trimmed) return "City is required";
  if (trimmed.length > 50) return "City must not exceed 50 characters";
  return null;
}

/**
 * Validate state name (optional).
 * Returns error message or null if valid.
 */
export function validateBranchState(state: string | unknown | undefined): string | null {
  if (state === undefined || state === null || state === "") return null;
  if (typeof state !== "string") return "State must be a string";
  if (state.trim().length > 50) return "State must not exceed 50 characters";
  return null;
}

/**
 * Validate pincode format (optional, but must be 6 digits if provided).
 * Returns error message or null if valid.
 */
export function validateBranchPincode(pincode: string | unknown | undefined): string | null {
  if (pincode === undefined || pincode === null || pincode === "") return null;
  if (typeof pincode !== "string") return "Pincode must be a string";
  const trimmed = pincode.trim();
  if (trimmed && !/^\d{6}$/.test(trimmed)) return "Pincode must be 6 digits";
  return null;
}

/**
 * Validate address (optional).
 * Returns error message or null if valid.
 */
export function validateBranchAddress(address: string | unknown | null | undefined): string | null {
  if (!address) return null;
  if (typeof address !== "string") return "Address must be a string";
  if (address.trim().length > 500) return "Address must not exceed 500 characters";
  return null;
}

/**
 * Validate phone (optional).
 * Returns error message or null if valid.
 */
export function validateBranchPhone(phone: string | unknown | null | undefined): string | null {
  if (!phone) return null;
  if (typeof phone !== "string") return "Phone must be a string";
  const trimmed = phone.trim();
  if (trimmed && !/^\+?[0-9\s-()]{7,15}$/.test(trimmed)) return "Invalid phone format";
  return null;
}

/**
 * Validate shipping charge (must be non-negative).
 * Returns error message or null if valid.
 */
export function validateShippingCharge(charge: unknown): string | null {
  const num = typeof charge === "number" ? charge : Number(charge);
  if (isNaN(num)) return "Shipping charge must be a number";
  if (num < 0) return "Shipping charge cannot be negative";
  return null;
}

/**
 * Normalize and validate branch input.
 * Returns sanitized BranchUpsertInput or null if invalid.
 */
export function normalizeBranchInput(body: Record<string, unknown>): BranchUpsertInput | null {
  const nameError = validateBranchName(body.name);
  if (nameError) return null;

  const slugError = validateBranchSlug(body.slug);
  if (slugError) return null;

  const cityError = validateBranchCity(body.city);
  if (cityError) return null;

  const stateError = validateBranchState(body.state);
  if (stateError) return null;

  const pincodeError = validateBranchPincode(body.pincode);
  if (pincodeError) return null;

  const addressError = validateBranchAddress(body.address);
  if (addressError) return null;

  const phoneError = validateBranchPhone(body.phone);
  if (phoneError) return null;

  const localChargeError = validateShippingCharge(body.local_shipping_charge);
  if (localChargeError) return null;

  const outstationChargeError = validateShippingCharge(body.outstation_shipping_charge);
  if (outstationChargeError) return null;

  return {
    name: String(body.name).trim(),
    slug: String(body.slug).trim().toLowerCase(),
    city: String(body.city).trim(),
    state: body.state ? String(body.state).trim() : undefined,
    pincode: body.pincode ? String(body.pincode).trim() : undefined,
    address: body.address ? String(body.address).trim() : null,
    phone: body.phone ? String(body.phone).trim() : null,
    local_shipping_charge: Number(body.local_shipping_charge),
    outstation_shipping_charge: Number(body.outstation_shipping_charge),
    is_active: body.is_active !== false,
    is_default: body.is_default === true,
    sort_order: typeof body.sort_order === "number" ? body.sort_order : 0
  };
}

/**
 * List all branches with service area counts and order usage info.
 */
export async function listAdminBranches(db: SupabaseClient): Promise<AdminBranchRow[]> {
  const { data: branches, error } = await db
    .from("branches")
    .select(
      `
      *,
      branch_service_areas(count)
    `
    )
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !branches) return [];

  // Fetch which branches have orders
  const { data: branchesWithOrders } = await db
    .from("orders")
    .select("branch_id")
    .not("branch_id", "is", null);

  const orderedBranchIds = new Set(
    (branchesWithOrders ?? []).map((o: { branch_id: string | null }) => o.branch_id)
  );

  return (
    branches as Array<{
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
      branch_service_areas: { count: number }[] | { count: number } | null
    }>
  ).map((row) => {
    const areaCount = Array.isArray(row.branch_service_areas)
      ? Number(row.branch_service_areas[0]?.count ?? 0)
      : Number(row.branch_service_areas?.count ?? 0);

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      address: row.address,
      city: row.city,
      state: row.state,
      pincode: row.pincode,
      phone: row.phone,
      local_shipping_charge: Number(row.local_shipping_charge),
      outstation_shipping_charge: Number(row.outstation_shipping_charge),
      is_active: Boolean(row.is_active),
      is_default: Boolean(row.is_default),
      sort_order: Number(row.sort_order),
      service_area_count: areaCount,
      used_in_orders: orderedBranchIds.has(row.id)
    };
  });
}

/**
 * Get single branch with service areas.
 */
export async function getAdminBranchDetail(
  db: SupabaseClient,
  branchId: string
): Promise<BranchWithAreas | null> {
  const { data, error } = await db
    .from("branches")
    .select(
      `
      *,
      branch_service_areas(*)
    `
    )
    .eq("id", branchId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as {
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
    branch_service_areas: BranchServiceAreaRecord[];
  };

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    address: row.address,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    phone: row.phone,
    local_shipping_charge: Number(row.local_shipping_charge),
    outstation_shipping_charge: Number(row.outstation_shipping_charge),
    is_active: Boolean(row.is_active),
    is_default: Boolean(row.is_default),
    sort_order: Number(row.sort_order),
    service_areas: (row.branch_service_areas ?? []).map((area: BranchServiceAreaRecord) => ({
      id: area.id,
      branch_id: area.branch_id,
      pincode: area.pincode,
      is_local: Boolean(area.is_local)
    }))
  };
}

/**
 * Validate pincode format for service areas.
 * Returns error message or null if valid.
 */
export function validateServiceAreaPincode(pincode: string | unknown): string | null {
  if (typeof pincode !== "string") return "Pincode is required";
  if (!/^\d{6}$/.test(pincode)) return "Pincode must be exactly 6 digits";
  return null;
}
