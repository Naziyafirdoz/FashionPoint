import type { User } from "@supabase/supabase-js";

import { ApiError, apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export const MAX_ADDRESSES = 5;
export const ADDRESS_LABELS = ["Home", "Work", "Other"] as const;

export const INCH_TO_CM = 2.54;
export const CM_TO_INCH = 1 / INCH_TO_CM;
export const KG_TO_LBS = 2.20462;

export type CustomerProfile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  preferred_size: string | null;
  bust_measurement: number | null;
  waist_measurement: number | null;
  shoulder_measurement: number | null;
};

export type CustomerMeasurements = {
  bust_measurement: number | null;
  underbust_measurement: number | null;
  waist_measurement: number | null;
  shoulder_measurement: number | null;
  height_cm: number | null;
  weight_kg: number | null;
};

export type AddressRecord = {
  id: string;
  label?: string | null;
  name?: string | null;
  phone?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  is_default: boolean;
};

export type DashboardProfileStatus = {
  percent: number;
  emailVerified: boolean;
  measurementsSaved: boolean;
  addressAdded: boolean;
  profileComplete: boolean;
  hasName: boolean;
  hasPhone: boolean;
};

export type AccountDashboardData = {
  displayName: string;
  email: string;
  initials: string;
  profile: DashboardProfileStatus;
  ordersCount: number;
  wishlistCount: number;
  addressesCount: number;
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  packing_assigned: "Packing",
  packed: "Packed",
  ready_to_ship: "Ready For Shipping",
  shipped: "Shipped",
  out_for_delivery: "Out For Delivery",
  delivered: "Delivered",
  cancel_requested: "Cancel Requested",
  cancellation_approved: "Cancellation Approved",
  cancelled: "Cancelled",
  returned: "Returned",
  cod_verification: "Processing",
};

const DISPATCHED_DELIVERY_STATUSES = new Set([
  "out_for_delivery",
  "shipped",
  "in_transit",
  "delivered",
]);

export function hasMeasurements(customer: {
  bust_measurement?: number | null;
  waist_measurement?: number | null;
  shoulder_measurement?: number | null;
} | null) {
  if (!customer) return false;
  return (
    customer.bust_measurement != null &&
    customer.waist_measurement != null &&
    customer.shoulder_measurement != null
  );
}

export function hasSavedMeasurements(customer: CustomerMeasurements | null | undefined) {
  if (!customer) return false;
  return (
    customer.bust_measurement != null ||
    customer.underbust_measurement != null ||
    customer.waist_measurement != null ||
    customer.shoulder_measurement != null ||
    customer.height_cm != null ||
    customer.weight_kg != null
  );
}

export function computeDashboardProfileStatus(
  customer: {
    full_name?: string | null;
    phone?: string | null;
    bust_measurement?: number | null;
    waist_measurement?: number | null;
    shoulder_measurement?: number | null;
  } | null,
  emailConfirmedAt?: string | null,
  addressesCount = 0
): DashboardProfileStatus {
  const hasName = Boolean(customer?.full_name?.trim());
  const hasPhone = Boolean(customer?.phone?.trim());
  const emailVerified = Boolean(emailConfirmedAt);
  const measurementsSaved = hasMeasurements(customer);
  const addressAdded = addressesCount > 0;
  const checks = [hasName, hasPhone, emailVerified, measurementsSaved, addressAdded];
  const percent = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  return {
    percent,
    emailVerified,
    measurementsSaved,
    addressAdded,
    profileComplete: percent === 100,
    hasName,
    hasPhone,
  };
}

export function getDisplayInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return "FP";
}

export function formatOrderStatus(status: string): string {
  const key = status.trim().toLowerCase();
  return ORDER_STATUS_LABELS[key] ?? status.split("_").join(" ");
}

export function canCustomerCancelOrder(order: {
  status?: string | null;
  delivery_status?: string | null;
}): boolean {
  const status = (order.status ?? "").toLowerCase();
  if (
    status === "cancelled" ||
    status === "returned" ||
    status === "cancel_requested" ||
    status === "cancellation_approved"
  ) {
    return false;
  }
  if (status !== "processing" && status !== "cod_verification") return false;
  const deliveryStatus = (order.delivery_status ?? "").toLowerCase();
  if (deliveryStatus && DISPATCHED_DELIVERY_STATUSES.has(deliveryStatus)) {
    return false;
  }
  return true;
}

export function isCodPaymentMethod(method?: string | null): boolean {
  return (method ?? "").trim().toLowerCase() === "cod";
}

export function isPrepaidPaymentMethod(method?: string | null): boolean {
  if (!method?.trim()) return true;
  return !isCodPaymentMethod(method);
}

export function orderIsPrepaidForCancel(order: Pick<CustomerOrder, "payment_method">): boolean {
  return isPrepaidPaymentMethod(order.payment_method);
}

export function resolveCancelledAt(order: Pick<CustomerOrder, "cancelled_at" | "updated_at" | "created_at">): string {
  return order.cancelled_at ?? order.updated_at ?? order.created_at;
}

export function refundMethodLabel(method?: string | null): string {
  switch ((method ?? "").toLowerCase()) {
    case "upi":
      return "UPI";
    case "bank_account":
      return "Bank Account";
    case "qr_code":
      return "QR Code";
    case "original_payment_method":
    case "razorpay":
      return "Original Payment Method";
    default:
      return method?.trim() || "—";
  }
}

export function customerRefundStatusLabel(order: Pick<CustomerOrder, "refund_status" | "payment_status">): string {
  const manual = (order.refund_status ?? "").toLowerCase();
  if (manual === "refund_details_submitted") return "Refund Details Submitted";
  if (manual === "refund_pending" || manual === "pending") return "Refund Pending";
  if (manual === "refunded") return "Refunded";
  if (manual === "completed") return "Completed";
  if (manual === "initiated") return "Initiated";
  const payment = (order.payment_status ?? "").toLowerCase();
  if (payment === "refund_pending") return "Initiated";
  if (payment === "refunded") return "Completed";
  return "—";
}

export function shouldShowCancelledRefundDetails(order: Pick<CustomerOrder, "status" | "payment_status" | "refund_method">): boolean {
  if ((order.status ?? "").toLowerCase() !== "cancelled") return false;
  const payment = (order.payment_status ?? "").toLowerCase();
  return payment === "refund_pending" || payment === "refunded" || Boolean(order.refund_method);
}

export function customerCancelRequestMessage(): string {
  return "Your cancellation request has been submitted. After approval, your refund will be processed to the original payment method used for this order.";
}

export function customerCancelApprovedMessage(order: Pick<CustomerOrder, "refund_method">): string {
  if (order.refund_method === "original_payment_method") {
    return "Your cancellation was approved. Your refund will be processed to the original payment method used for this order.";
  }
  return "Your cancellation was approved. We are processing your refund and will complete it shortly.";
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function requiredAddressError(input: {
  name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
}): string | null {
  if (!input.name || !input.phone || !input.line1 || !input.city || !input.state || !input.pincode) {
    return "Please fill in all required fields.";
  }
  if (!/^[0-9]{6}$/.test(input.pincode)) {
    return "Please enter a 6-digit pincode.";
  }
  return null;
}

function asNumberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toDisplayValue(value: number | null | undefined, convert: (n: number) => number): string {
  if (value == null) return "";
  const converted = convert(value);
  return Number.isInteger(converted) ? String(converted) : String(Number(converted.toFixed(1)));
}

export function toDisplayInches(value: number | null | undefined, unit: "inch" | "cm"): string {
  return toDisplayValue(value, (n) => (unit === "inch" ? n : n * INCH_TO_CM));
}

export function toDisplayHeight(valueCm: number | null | undefined, unit: "cm" | "inch"): string {
  return toDisplayValue(valueCm, (n) => (unit === "cm" ? n : n * CM_TO_INCH));
}

export function toDisplayWeight(valueKg: number | null | undefined, unit: "kg" | "lb"): string {
  return toDisplayValue(valueKg, (n) => (unit === "kg" ? n : n * KG_TO_LBS));
}

function parseOptionalNumber(raw: string): number | null {
  if (!raw.trim()) return null;
  const num = Number(raw);
  return Number.isNaN(num) ? null : num;
}

export function parseBodyMeasurement(raw: string, unit: "inch" | "cm"): number | null {
  const num = parseOptionalNumber(raw);
  if (num == null) return null;
  return unit === "cm" ? num * CM_TO_INCH : num;
}

export function parseHeight(raw: string, unit: "cm" | "inch"): number | null {
  const num = parseOptionalNumber(raw);
  if (num == null) return null;
  return unit === "inch" ? num * INCH_TO_CM : num;
}

export function parseWeight(raw: string, unit: "kg" | "lb"): number | null {
  const num = parseOptionalNumber(raw);
  if (num == null) return null;
  return unit === "lb" ? num / KG_TO_LBS : num;
}

export function formatBodyMeasurement(valueInches: number | null | undefined, unit: "inch" | "cm") {
  if (valueInches == null) return "—";
  const cm = valueInches * INCH_TO_CM;
  return unit === "inch"
    ? `${valueInches.toFixed(1)}" / ${cm.toFixed(1)} cm`
    : `${cm.toFixed(1)} cm / ${valueInches.toFixed(1)}"`;
}

export function formatHeight(valueCm: number | null | undefined, unit: "cm" | "inch") {
  if (valueCm == null) return "—";
  const inches = valueCm * CM_TO_INCH;
  return unit === "cm"
    ? `${valueCm.toFixed(1)} cm / ${inches.toFixed(1)}"`
    : `${inches.toFixed(1)}" / ${valueCm.toFixed(1)} cm`;
}

export function formatWeight(valueKg: number | null | undefined, unit: "kg" | "lb") {
  if (valueKg == null) return "—";
  const lbs = valueKg * KG_TO_LBS;
  return unit === "kg"
    ? `${valueKg.toFixed(1)} kg / ${lbs.toFixed(1)} lbs`
    : `${lbs.toFixed(1)} lbs / ${valueKg.toFixed(1)} kg`;
}

export function getOrderItemProductId(item: {
  product_id?: string | null;
  productId?: string | null;
}): string {
  return item.product_id?.trim() || item.productId?.trim() || "";
}

type DashboardCustomerRow = {
  full_name?: string | null;
  phone?: string | null;
  bust_measurement?: number | null;
  waist_measurement?: number | null;
  shoulder_measurement?: number | null;
};

function accountLog(source: string, details: Record<string, unknown>) {
  if (typeof __DEV__ === "undefined" || !__DEV__) return;
  console.log("[account]", { source, ...details });
}

async function countOwnRows(
  source: string,
  table: "orders" | "wishlist" | "addresses",
  column: "user_id" | "customer_id",
  userId: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "estimated", head: true })
      .eq(column, userId);

    if (error) {
      accountLog(source, { status: "error", error: error.message });
      return 0;
    }

    accountLog(source, { status: "ok", count: count ?? 0 });
    return count ?? 0;
  } catch (err) {
    accountLog(source, {
      status: "error",
      error: err instanceof Error ? err.message : "count failed",
    });
    return 0;
  }
}

export async function fetchAccountDashboard(user: User): Promise<AccountDashboardData> {
  const { data: sessionData } = await supabase.auth.getSession();
  accountLog("session", {
    hasUser: Boolean(user.id),
    hasSession: Boolean(sessionData.session),
    hasAccessToken: Boolean(sessionData.session?.access_token),
  });

  let customer: DashboardCustomerRow | null = null;
  try {
    const customerResult = await supabase
      .from("customers")
      .select("full_name, phone, bust_measurement, waist_measurement, shoulder_measurement")
      .eq("id", user.id)
      .maybeSingle();

    if (customerResult.error) {
      accountLog("customers", { status: "error", error: customerResult.error.message });
    } else {
      customer = (customerResult.data ?? null) as DashboardCustomerRow | null;
      accountLog("customers", {
        status: "ok",
        hasRow: Boolean(customer),
        hasFullName: Boolean(customer?.full_name),
      });
    }
  } catch (err) {
    accountLog("customers", {
      status: "error",
      error: err instanceof Error ? err.message : "customer lookup failed",
    });
  }

  const [ordersCount, wishlistCount, addressesCount] = await Promise.all([
    countOwnRows("orders", "orders", "user_id", user.id),
    countOwnRows("wishlist", "wishlist", "user_id", user.id),
    countOwnRows("addresses", "addresses", "customer_id", user.id),
  ]);

  const displayName =
    customer?.full_name?.trim() ||
    (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "") ||
    user.email?.split("@")[0] ||
    "there";

  return {
    displayName,
    email: user.email ?? "",
    initials: getDisplayInitials(displayName),
    profile: computeDashboardProfileStatus(customer, user.email_confirmed_at, addressesCount),
    ordersCount,
    wishlistCount,
    addressesCount,
  };
}

export function emptyMeasurements(): CustomerMeasurements {
  return {
    bust_measurement: null,
    underbust_measurement: null,
    waist_measurement: null,
    shoulder_measurement: null,
    height_cm: null,
    weight_kg: null,
  };
}

export function parseMeasurementsPayload(raw: unknown): CustomerMeasurements {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    bust_measurement: asNumberOrNull(row.bust_measurement),
    underbust_measurement: asNumberOrNull(row.underbust_measurement),
    waist_measurement: asNumberOrNull(row.waist_measurement),
    shoulder_measurement: asNumberOrNull(row.shoulder_measurement),
    height_cm: asNumberOrNull(row.height_cm),
    weight_kg: asNumberOrNull(row.weight_kg),
  };
}

export type AddressInput = {
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
};

export type CustomerOrderItem = {
  name: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  subtotal: number;
  product_id: string;
  productId: string;
  image?: string;
  sku?: string;
};

export type CustomerOrder = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method?: string | null;
  delivery_status?: string | null;
  subtotal: number | null;
  shipping_amount: number | null;
  discount_amount: number | null;
  total: number;
  created_at: string;
  updated_at?: string | null;
  delivery_confirmed_at?: string | null;
  tracking_id?: string | null;
  tracking_number?: string | null;
  shipment_id?: string | null;
  guest_email?: string | null;
  user_id?: string;
  refund_status?: string | null;
  refund_method?: string | null;
  refund_amount?: number | null;
  cancelled_at?: string | null;
  cancel_requested_at?: string | null;
  cancellation_reason?: string | null;
  items: CustomerOrderItem[];
  shipping_address?: Record<string, string>;
};

/**
 * Website My Orders select (`CUSTOMER_ORDER_LIST_SELECT`) plus stored total columns
 * that already exist on `orders` (`subtotal`, `shipping_amount`, `discount_amount`).
 */
const CUSTOMER_ORDER_SELECT =
  "id,order_number,created_at,status,payment_status,payment_method,total,subtotal,shipping_amount,discount_amount,items,user_id,guest_email,shipping_address,updated_at,delivery_confirmed_at,tracking_id,tracking_number,shipment_id,delivery_status,refund_status,refund_method,refund_amount,cancelled_at,cancel_requested_at,cancellation_reason";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  upi: "UPI",
  card: "Card",
  netbanking: "Net Banking",
  wallet: "Wallet",
  cod: "COD",
};

const CUSTOMER_ORDER_LIST_LIMIT = 20;

async function requireAuthUser(): Promise<User> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new ApiError("Please sign in to continue.", 401, undefined, "unauthenticated");
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new ApiError("Your session has expired. Please sign in again.", 401, undefined, "expired");
  }
  return data.user;
}

function queryFailed(error: { message?: string } | null, fallback: string): never {
  throw new Error(error?.message?.trim() || fallback);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asNullableText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

async function ensureOwnCustomerRow(user: User): Promise<void> {
  const { data, error } = await supabase
    .from("customers")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) queryFailed(error, "Unable to load your account.");
  if (data) return;

  const { error: insertError } = await supabase.from("customers").insert({
    id: user.id,
    email: user.email ?? "",
  });

  if (insertError && insertError.code !== "23505") {
    queryFailed(insertError, "Unable to create your customer profile.");
  }
}

function toCustomerProfile(user: User, row: Record<string, unknown> | null): CustomerProfile {
  return {
    id: user.id,
    email: user.email ?? "",
    full_name: asNullableText(row?.full_name),
    phone: asNullableText(row?.phone),
    preferred_size: asNullableText(row?.preferred_size),
    bust_measurement: asNumberOrNull(row?.bust_measurement),
    waist_measurement: asNumberOrNull(row?.waist_measurement),
    shoulder_measurement: asNumberOrNull(row?.shoulder_measurement),
  };
}

export async function fetchCustomerProfile(): Promise<CustomerProfile> {
  const user = await requireAuthUser();
  const { data, error } = await supabase
    .from("customers")
    .select("full_name, phone, preferred_size, bust_measurement, waist_measurement, shoulder_measurement")
    .eq("id", user.id)
    .maybeSingle();

  if (error) queryFailed(error, "Unable to load profile.");
  return toCustomerProfile(user, data ? asRecord(data) : null);
}

export async function updateCustomerProfile(input: {
  full_name: string;
  phone: string;
  preferred_size: string;
  bust_measurement: string;
  waist_measurement: string;
  shoulder_measurement: string;
}): Promise<CustomerProfile> {
  const user = await requireAuthUser();
  await ensureOwnCustomerRow(user);

  const payload = {
    full_name: asNullableText(input.full_name),
    phone: asNullableText(input.phone),
    preferred_size: asNullableText(input.preferred_size),
    bust_measurement: asNumberOrNull(input.bust_measurement),
    waist_measurement: asNumberOrNull(input.waist_measurement),
    shoulder_measurement: asNumberOrNull(input.shoulder_measurement),
  };

  const { data, error } = await supabase
    .from("customers")
    .update(payload)
    .eq("id", user.id)
    .select("full_name, phone, preferred_size, bust_measurement, waist_measurement, shoulder_measurement")
    .maybeSingle();

  if (error) queryFailed(error, "Unable to update profile.");
  if (!data) queryFailed(null, "Unable to update profile.");
  return toCustomerProfile(user, asRecord(data));
}

export async function fetchCustomerMeasurements(): Promise<CustomerMeasurements> {
  const user = await requireAuthUser();
  const { data, error } = await supabase
    .from("customers")
    .select(
      "bust_measurement, underbust_measurement, waist_measurement, shoulder_measurement, height_cm, weight_kg"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) queryFailed(error, "Unable to load measurements.");
  return parseMeasurementsPayload(data);
}

export async function updateCustomerMeasurements(
  measurements: CustomerMeasurements
): Promise<CustomerMeasurements> {
  const user = await requireAuthUser();
  await ensureOwnCustomerRow(user);

  const payload: CustomerMeasurements = {
    bust_measurement: measurements.bust_measurement,
    underbust_measurement: measurements.underbust_measurement,
    waist_measurement: measurements.waist_measurement,
    shoulder_measurement: measurements.shoulder_measurement,
    height_cm: measurements.height_cm,
    weight_kg: measurements.weight_kg,
  };

  const { data, error } = await supabase
    .from("customers")
    .update(payload)
    .eq("id", user.id)
    .select(
      "bust_measurement, underbust_measurement, waist_measurement, shoulder_measurement, height_cm, weight_kg"
    )
    .maybeSingle();

  if (error) queryFailed(error, "Unable to update measurements.");
  if (!data) queryFailed(null, "Unable to update measurements.");
  return parseMeasurementsPayload(data);
}

function toAddressRecord(row: Record<string, unknown>): AddressRecord {
  return {
    id: String(row.id ?? ""),
    label: typeof row.label === "string" ? row.label : row.label == null ? null : String(row.label),
    name: typeof row.name === "string" ? row.name : row.name == null ? null : String(row.name),
    phone: typeof row.phone === "string" ? row.phone : row.phone == null ? null : String(row.phone),
    line1: typeof row.line1 === "string" ? row.line1 : row.line1 == null ? null : String(row.line1),
    line2: typeof row.line2 === "string" ? row.line2 : row.line2 == null ? null : String(row.line2),
    city: typeof row.city === "string" ? row.city : row.city == null ? null : String(row.city),
    state: typeof row.state === "string" ? row.state : row.state == null ? null : String(row.state),
    pincode:
      typeof row.pincode === "string" ? row.pincode : row.pincode == null ? null : String(row.pincode),
    is_default: Boolean(row.is_default),
  };
}

export async function fetchCustomerAddresses(): Promise<AddressRecord[]> {
  const user = await requireAuthUser();
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("customer_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) queryFailed(error, "Unable to load addresses.");
  return (data ?? []).map((row) => toAddressRecord(asRecord(row)));
}

async function clearDefaultAddresses(userId: string): Promise<void> {
  const { error } = await supabase.from("addresses").update({ is_default: false }).eq("customer_id", userId);
  if (error) queryFailed(error, "Unable to update default address.");
}

export async function saveCustomerAddress(
  input: AddressInput,
  addressId?: string | null
): Promise<void> {
  const user = await requireAuthUser();
  const validationError = requiredAddressError(input);
  if (validationError) throw new Error(validationError);

  await ensureOwnCustomerRow(user);

  const { count, error: countError } = await supabase
    .from("addresses")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", user.id);

  if (countError) queryFailed(countError, "Unable to save address.");

  const existingCount = count ?? 0;
  if (!addressId && existingCount >= MAX_ADDRESSES) {
    throw new Error(`You can save up to ${MAX_ADDRESSES} addresses.`);
  }

  const isFirstAddress = !addressId && existingCount === 0;
  const isDefault = input.is_default || isFirstAddress;
  if (isDefault) {
    await clearDefaultAddresses(user.id);
  }

  const payload = {
    customer_id: user.id,
    label: input.label.trim() || "Home",
    name: input.name.trim(),
    phone: input.phone.trim(),
    line1: input.line1.trim(),
    line2: input.line2.trim() || null,
    city: input.city.trim(),
    state: input.state.trim(),
    pincode: input.pincode.trim(),
    is_default: isDefault,
  };

  if (addressId) {
    const { data, error } = await supabase
      .from("addresses")
      .update(payload)
      .eq("id", addressId)
      .eq("customer_id", user.id)
      .select("id")
      .maybeSingle();
    if (error) queryFailed(error, "Unable to save address.");
    if (!data) throw new Error("Address not found");
    return;
  }

  const { error } = await supabase.from("addresses").insert(payload);
  if (error) queryFailed(error, "Unable to save address.");
}

export async function deleteCustomerAddress(addressId: string): Promise<void> {
  const user = await requireAuthUser();
  const { error } = await supabase
    .from("addresses")
    .delete()
    .eq("id", addressId)
    .eq("customer_id", user.id);
  if (error) queryFailed(error, "Unable to delete address.");
}

export async function setDefaultCustomerAddress(addressId: string): Promise<void> {
  const user = await requireAuthUser();
  await clearDefaultAddresses(user.id);
  const { data, error } = await supabase
    .from("addresses")
    .update({ is_default: true })
    .eq("id", addressId)
    .eq("customer_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) queryFailed(error, "Unable to set default address.");
  if (!data) throw new Error("Address not found");
}

function readItemString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function readItemNumber(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = obj[key];
    if (value == null || value === "") continue;
    const num = Number(value);
    if (!Number.isNaN(num)) return num;
  }
  return 0;
}

function readItemImage(obj: Record<string, unknown>): string | undefined {
  const direct = readItemString(obj, "image", "image_url", "thumbnail");
  if (direct) return direct;
  const product = asRecord(obj.product);
  const images = product.images;
  if (!Array.isArray(images) || images.length === 0) return undefined;
  const first = images[0];
  if (typeof first === "string" && first.trim()) return first.trim();
  const nested = asRecord(first);
  return readItemString(nested, "url", "src", "secure_url") || undefined;
}

function optionalNumeric(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function optionalText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeOrderItem(raw: unknown): CustomerOrderItem | null {
  const obj = asRecord(raw);
  if (!Object.keys(obj).length) return null;
  const productId = readItemString(obj, "productId", "product_id");
  const name = readItemString(obj, "name") || "Product";
  if (!readItemString(obj, "name") && !productId) return null;
  const quantity = Math.max(1, readItemNumber(obj, "quantity") || 1);
  const price = readItemNumber(obj, "price");
  return {
    name,
    size: readItemString(obj, "size") || "—",
    color: readItemString(obj, "color") || "—",
    quantity,
    price,
    subtotal: price * quantity,
    product_id: productId,
    productId,
    image: readItemImage(obj),
    sku: readItemString(obj, "sku") || undefined,
  };
}

function normalizeOrderItems(raw: unknown): CustomerOrderItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeOrderItem).filter((item): item is CustomerOrderItem => item != null);
}

function normalizeShippingAddress(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) out[key] = text;
  }
  return Object.keys(out).length ? out : undefined;
}

function toCustomerOrder(row: Record<string, unknown>, ownerId: string): CustomerOrder {
  return {
    id: String(row.id ?? ""),
    order_number: String(row.order_number ?? ""),
    status: String(row.status ?? ""),
    payment_status: String(row.payment_status ?? ""),
    payment_method: optionalText(row.payment_method),
    delivery_status: optionalText(row.delivery_status),
    subtotal: optionalNumeric(row.subtotal),
    shipping_amount: optionalNumeric(row.shipping_amount),
    discount_amount: optionalNumeric(row.discount_amount),
    total: Number(row.total ?? 0) || 0,
    created_at: String(row.created_at ?? ""),
    updated_at: optionalText(row.updated_at),
    delivery_confirmed_at: optionalText(row.delivery_confirmed_at),
    tracking_id: optionalText(row.tracking_id),
    tracking_number: optionalText(row.tracking_number),
    shipment_id: optionalText(row.shipment_id),
    guest_email: optionalText(row.guest_email),
    user_id: ownerId,
    refund_status: optionalText(row.refund_status),
    refund_method: optionalText(row.refund_method),
    refund_amount: optionalNumeric(row.refund_amount),
    cancelled_at: optionalText(row.cancelled_at),
    cancel_requested_at: optionalText(row.cancel_requested_at),
    cancellation_reason: optionalText(row.cancellation_reason),
    items: normalizeOrderItems(row.items),
    shipping_address: normalizeShippingAddress(row.shipping_address),
  };
}

export function resolveRouteId(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() ?? "";
}

export function formatOrderDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatOrderTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatOrderDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = formatOrderDate(iso);
  const time = formatOrderTime(iso);
  return time ? `${date} · ${time}` : date;
}

export function formatPaymentMethod(method?: string | null): string {
  if (!method?.trim()) return "";
  return PAYMENT_METHOD_LABELS[method.trim().toLowerCase()] ?? method.trim().toUpperCase();
}

export function formatPaymentStatus(status?: string | null): string {
  if (!status?.trim()) return "—";
  if (status === "refund_pending") return "Refund Pending";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatDeliveryStatus(status?: string | null): string {
  if (!status?.trim()) return "";
  return formatPaymentStatus(status);
}

export const CUSTOMER_ORDER_STATUS_MESSAGE = "We'll update your order status as it progresses.";

export type BadgePalette = {
  backgroundColor: string;
  color: string;
};

function normalizeStatusKey(status?: string | null): string {
  return (status ?? "").trim().toLowerCase();
}

export function orderStatusBadgePalette(status?: string | null): BadgePalette {
  const key = normalizeStatusKey(status) === "cod_verification" ? "processing" : normalizeStatusKey(status);
  switch (key) {
    case "processing":
    case "pending":
      return { backgroundColor: "#FEF3C7", color: "#92400E" };
    case "confirmed":
      return { backgroundColor: "#D1FAE5", color: "#047857" };
    case "packing_assigned":
    case "packed":
      return { backgroundColor: "#E8F1FF", color: "#1D4ED8" };
    case "ready_to_ship":
      return { backgroundColor: "#F3E8FF", color: "#7E22CE" };
    case "shipped":
    case "out_for_delivery":
      return { backgroundColor: "#EDE9FE", color: "#5B21B6" };
    case "delivered":
      return { backgroundColor: "#D1FAE5", color: "#047857" };
    case "cancel_requested":
    case "cancellation_approved":
      return { backgroundColor: "#FFEDD5", color: "#9A3412" };
    case "cancelled":
    case "returned":
      return { backgroundColor: "#FEE2E2", color: "#B91C1C" };
    default:
      return { backgroundColor: "#FFF5F7", color: "#7B0D2B" };
  }
}

export function paymentStatusBadgePalette(status?: string | null): BadgePalette {
  const key = normalizeStatusKey(status);
  if (key === "paid" || key === "captured") return { backgroundColor: "#ECFDF3", color: "#15803D" };
  if (key === "refund_pending") return { backgroundColor: "#FEF9C3", color: "#854D0E" };
  if (key === "refunded") return { backgroundColor: "#F1F5F9", color: "#334155" };
  if (key === "failed" || key === "unpaid") return { backgroundColor: "#FEE2E2", color: "#B91C1C" };
  return { backgroundColor: "#ECFDF3", color: "#15803D" };
}

export function paymentMethodBadgePalette(): BadgePalette {
  return { backgroundColor: "#DBEAFE", color: "#1D4ED8" };
}

export function shouldShowOrderProgressMessage(status?: string | null): boolean {
  const key = normalizeStatusKey(status) === "cod_verification" ? "processing" : normalizeStatusKey(status);
  return (
    key !== "cancelled" &&
    key !== "delivered" &&
    key !== "returned" &&
    key !== "cancel_requested" &&
    key !== "cancellation_approved"
  );
}

export function isCancelPendingStatus(status?: string | null): boolean {
  const key = normalizeStatusKey(status);
  return key === "cancel_requested" || key === "cancellation_approved";
}

export function customerCancellationNotice(status?: string | null): string | null {
  const key = normalizeStatusKey(status);
  if (key === "cancel_requested") {
    return "Cancellation request submitted — awaiting store review.";
  }
  if (key === "cancellation_approved") {
    return "Your cancellation was approved. We are processing your refund and will complete it shortly.";
  }
  if (key === "cancelled") return "This order has been cancelled.";
  return null;
}

export function refundStatusLabel(paymentStatus?: string | null): string {
  const key = normalizeStatusKey(paymentStatus);
  if (key === "refund_pending") return "Refund Pending";
  if (key === "refunded") return "Refunded";
  return "";
}

export function toOrderLoadMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error && error.message.trim() ? error.message.trim() : fallback;
  if (/session has expired/i.test(message)) return fallback;
  return message;
}

export function orderItemCount(order: CustomerOrder): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function formatShippingLines(address?: Record<string, string>): string[] {
  if (!address) return [];
  const line =
    address.line ||
    address.house_flat ||
    [address.line1, address.line2].filter(Boolean).join(", ") ||
    address.address;
  return [
    address.name,
    address.phone,
    line,
    [address.city, address.state].filter(Boolean).join(", "),
    address.pincode || address.postal_code,
  ].filter(Boolean);
}

export function formatShippingSummary(address?: Record<string, string>): string {
  if (!address) return "";
  return [address.city, address.state, address.pincode || address.postal_code].filter(Boolean).join(", ");
}

export async function fetchCustomerOrders(): Promise<CustomerOrder[]> {
  const user = await requireAuthUser();
  const { data, error } = await supabase
    .from("orders")
    .select(CUSTOMER_ORDER_SELECT)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(CUSTOMER_ORDER_LIST_LIMIT);

  if (error) queryFailed(error, "Unable to load orders.");
  return (data ?? []).map((row) => toCustomerOrder(asRecord(row), user.id));
}

export async function fetchCustomerOrderById(orderId: string): Promise<CustomerOrder> {
  const user = await requireAuthUser();
  const id = orderId.trim();
  if (!id) throw new Error("This order could not be found.");

  const { data, error } = await supabase
    .from("orders")
    .select(CUSTOMER_ORDER_SELECT)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) queryFailed(error, "Unable to load this order.");
  if (!data) throw new Error("This order could not be found.");
  return toCustomerOrder(asRecord(data), user.id);
}

function isUnsafeCancelError(message: string): boolean {
  return /stack|sql|schema cache|pgrst|column error|permission denied|internal server|database schema/i.test(
    message
  );
}

export function toCancelOrderMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "unauthenticated") {
      return "Please sign in to continue.";
    }
    if (error.code === "expired") {
      return "Your session has expired. Please sign in again.";
    }
    if (error.code === "unauthorized") {
      return "We could not verify your sign-in with the store. Please sign in again.";
    }
    if (error.code === "network" || error.status === 0) {
      return "No internet connection. Please check your network and try again.";
    }
    const message = error.message.trim();
    if (message && !isUnsafeCancelError(message)) return message;
    if (error.status >= 500) return "The store could not complete this cancellation. Please try again.";
  } else if (error instanceof Error) {
    const message = error.message.trim();
    if (message && !isUnsafeCancelError(message)) return message;
  }
  return "Something went wrong. Please try again.";
}

export type CancelOrderResult = {
  message: string;
  order?: CustomerOrder;
};

export async function submitCustomerOrderCancellation(
  orderId: string,
  cancellationReason?: string
): Promise<CancelOrderResult> {
  const user = await requireAuthUser();
  const result = await apiFetch<{
    message?: string;
    order?: Record<string, unknown>;
  }>(`/api/orders/${orderId}/cancel`, {
    method: "POST",
    auth: "required",
    body: JSON.stringify({
      cancellation_reason: cancellationReason?.trim() || undefined,
    }),
  });

  return {
    message: result.message?.trim() || "Your order has been cancelled.",
    order: result.order ? toCustomerOrder(asRecord(result.order), user.id) : undefined,
  };
}
