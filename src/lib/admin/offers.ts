import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertCatalogTargetIdsExist,
  parseCatalogTargeting
} from "@/lib/admin/catalog-targeting";
import type { OfferDiscountType, OfferScope } from "@/lib/offers/types";

export { uniqueIds, findMissingIds } from "@/lib/admin/catalog-targeting";

export type AdminOfferStatus = "disabled" | "scheduled" | "active" | "expired";

export type AdminOfferRow = {
  id: string;
  name: string;
  description: string | null;
  discount_type: OfferDiscountType;
  discount_value: number;
  scope: OfferScope;
  starts_at: string;
  ends_at: string | null;
  is_enabled: boolean;
  banner_image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminOfferDto = {
  id: string;
  name: string;
  description: string | null;
  discountType: OfferDiscountType;
  discountValue: number;
  scope: OfferScope;
  startsAt: string;
  endsAt: string | null;
  isEnabled: boolean;
  productIds: string[];
  categoryIds: string[];
  status: AdminOfferStatus;
  createdAt: string;
  updatedAt: string;
};

export type AdminOfferUpsertInput = {
  name: string;
  description: string | null;
  discountType: OfferDiscountType;
  discountValue: number;
  scope: OfferScope;
  startsAt: Date;
  endsAt: Date | null;
  isEnabled: boolean;
  productIds: string[];
  categoryIds: string[];
};

type OfferTargeting = {
  productIds: string[];
  categoryIds: string[];
};

const DISCOUNT_TYPES = new Set<OfferDiscountType>(["percentage", "fixed_amount"]);
const STATUSES = new Set<AdminOfferStatus>(["disabled", "scheduled", "active", "expired"]);

const CLIENT_READ_ERROR = "Unable to load offers. Please try again.";
const CLIENT_WRITE_ERROR = "Unable to save this offer. Please try again.";
const CLIENT_TARGETING_ERROR = "Unable to save offer targeting. Please try again.";
const CLIENT_CREATE_CLEANUP_ERROR =
  "Offer creation failed and automatic cleanup also failed. Please try again.";
const CLIENT_RECOVERY_ERROR =
  "The offer update failed and recovery was incomplete. Please try again.";

function logOfferAdminError(event: string, details: Record<string, unknown>) {
  console.error("[admin/offers]", event, details);
}

function isDiscountType(value: string): value is OfferDiscountType {
  return DISCOUNT_TYPES.has(value as OfferDiscountType);
}

export function isAdminOfferStatus(value: string): value is AdminOfferStatus {
  return STATUSES.has(value as AdminOfferStatus);
}

export function deriveOfferStatus(
  offer: { isEnabled: boolean; startsAt: Date | string; endsAt: Date | string | null },
  now: Date = new Date()
): AdminOfferStatus {
  if (!offer.isEnabled) return "disabled";

  const startsAt = offer.startsAt instanceof Date ? offer.startsAt : new Date(offer.startsAt);
  const nowMs = now.getTime();

  if (nowMs < startsAt.getTime()) return "scheduled";
  if (offer.endsAt == null || offer.endsAt === "") return "active";
  const endsAt = offer.endsAt instanceof Date ? offer.endsAt : new Date(offer.endsAt);
  if (nowMs > endsAt.getTime()) return "expired";
  return "active";
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.trim();
}

function isEmptyDateInput(value: unknown): boolean {
  if (value == null || value === "") return true;
  return typeof value === "string" && value.trim() === "";
}

function parseDateValue(
  value: unknown,
  field: string
): { ok: true; date: Date } | { ok: false; error: string } {
  const date = value instanceof Date ? value : new Date(typeof value === "string" ? value : String(value));
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: `${field} must be a valid date` };
  }
  return { ok: true, date };
}

function parseRequiredDate(value: unknown, field: string): { ok: true; date: Date } | { ok: false; error: string } {
  if (isEmptyDateInput(value)) {
    return { ok: false, error: `${field} is required` };
  }
  return parseDateValue(value, field);
}

export function parseOfferUpsertInput(
  body: unknown,
  now: Date = new Date()
): { ok: true; input: AdminOfferUpsertInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid offer payload" };
  }

  const row = body as Record<string, unknown>;
  const name = asTrimmedString(row.name);
  if (!name) {
    return { ok: false, error: "Name is required" };
  }

  const descriptionRaw = row.description;
  let description: string | null = null;
  if (descriptionRaw != null && descriptionRaw !== "") {
    if (typeof descriptionRaw !== "string") {
      return { ok: false, error: "Description must be a string" };
    }
    description = descriptionRaw.trim() || null;
  }

  const discountTypeRaw =
    typeof row.discountType === "string"
      ? row.discountType
      : typeof row.discount_type === "string"
        ? row.discount_type
        : "";
  if (!isDiscountType(discountTypeRaw)) {
    return { ok: false, error: "Discount type must be percentage or fixed_amount" };
  }

  const discountValueRaw = row.discountValue ?? row.discount_value;
  const discountValue = typeof discountValueRaw === "number" ? discountValueRaw : Number(discountValueRaw);
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return { ok: false, error: "Discount value must be greater than 0" };
  }
  if (discountTypeRaw === "percentage" && discountValue > 100) {
    return { ok: false, error: "Percentage discount cannot be greater than 100" };
  }

  const scheduleRaw = row.scheduleType ?? row.schedule_type;
  if (scheduleRaw != null && scheduleRaw !== "" && scheduleRaw !== "limited" && scheduleRaw !== "ongoing") {
    return { ok: false, error: "scheduleType must be limited or ongoing" };
  }

  const startsRaw = row.startsAt ?? row.starts_at;
  const endsRaw = row.endsAt ?? row.ends_at;
  const isOngoing = scheduleRaw === "ongoing" || (scheduleRaw !== "limited" && isEmptyDateInput(endsRaw));

  let startsAt: Date;
  let endsAt: Date | null;

  if (isOngoing) {
    if (isEmptyDateInput(startsRaw)) {
      startsAt = now;
    } else {
      const startsAtResult = parseDateValue(startsRaw, "startsAt");
      if (!startsAtResult.ok) return startsAtResult;
      startsAt = startsAtResult.date;
    }
    endsAt = null;
  } else {
    const startsAtResult = parseRequiredDate(startsRaw, "startsAt");
    if (!startsAtResult.ok) return startsAtResult;
    const endsAtResult = parseRequiredDate(endsRaw, "endsAt");
    if (!endsAtResult.ok) return endsAtResult;
    if (endsAtResult.date.getTime() <= startsAtResult.date.getTime()) {
      return { ok: false, error: "endsAt must be later than startsAt" };
    }
    startsAt = startsAtResult.date;
    endsAt = endsAtResult.date;
  }

  const isEnabledRaw = row.isEnabled ?? row.is_enabled;
  if (isEnabledRaw != null && typeof isEnabledRaw !== "boolean") {
    return { ok: false, error: "isEnabled must be a boolean" };
  }
  const isEnabled = isEnabledRaw === true;

  const targeting = parseCatalogTargeting(row, "offer");
  if (!targeting.ok) return targeting;

  return {
    ok: true,
    input: {
      name,
      description,
      discountType: discountTypeRaw,
      discountValue,
      scope: targeting.targeting.scope,
      startsAt,
      endsAt,
      isEnabled,
      productIds: targeting.targeting.productIds,
      categoryIds: targeting.targeting.categoryIds
    }
  };
}

export function toAdminOfferDto(
  row: AdminOfferRow,
  targeting: OfferTargeting,
  now: Date = new Date()
): AdminOfferDto {
  const discountValue = Number(row.discount_value);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    discountType: row.discount_type,
    discountValue,
    scope: row.scope,
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? null,
    isEnabled: row.is_enabled === true,
    productIds: targeting.productIds,
    categoryIds: targeting.categoryIds,
    status: deriveOfferStatus(
      { isEnabled: row.is_enabled === true, startsAt: row.starts_at, endsAt: row.ends_at },
      now
    ),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function offerWriteRow(input: AdminOfferUpsertInput, updatedAt?: Date) {
  const row: Record<string, unknown> = {
    name: input.name,
    description: input.description,
    discount_type: input.discountType,
    discount_value: input.discountValue,
    scope: input.scope,
    starts_at: input.startsAt.toISOString(),
    ends_at: input.endsAt ? input.endsAt.toISOString() : null,
    is_enabled: input.isEnabled
  };
  if (updatedAt) row.updated_at = updatedAt.toISOString();
  return row;
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

async function loadTargeting(
  db: SupabaseClient,
  offerIds: string[]
): Promise<{ ok: true; targeting: Map<string, OfferTargeting> } | { ok: false; error: string }> {
  const targeting = new Map<string, OfferTargeting>();
  for (const id of offerIds) {
    targeting.set(id, { productIds: [], categoryIds: [] });
  }
  if (offerIds.length === 0) return { ok: true, targeting };

  const [productResult, categoryResult] = await Promise.all([
    db.from("offer_products").select("offer_id, product_id").in("offer_id", offerIds),
    db.from("offer_categories").select("offer_id, category_id").in("offer_id", offerIds)
  ]);

  if (productResult.error || categoryResult.error) {
    logOfferAdminError("load_targeting_failed", {
      offerIds,
      productCode: productResult.error?.code ?? null,
      categoryCode: categoryResult.error?.code ?? null,
      productMessage: productResult.error?.message ?? null,
      categoryMessage: categoryResult.error?.message ?? null
    });
    return { ok: false, error: CLIENT_READ_ERROR };
  }

  for (const row of productResult.data ?? []) {
    targeting.get(row.offer_id as string)?.productIds.push(row.product_id as string);
  }
  for (const row of categoryResult.data ?? []) {
    targeting.get(row.offer_id as string)?.categoryIds.push(row.category_id as string);
  }

  return { ok: true, targeting };
}

export async function assertTargetIdsExist(
  db: SupabaseClient,
  input: AdminOfferUpsertInput
): Promise<{ ok: true } | { ok: false; error: string; status: 400 | 500 }> {
  return assertCatalogTargetIdsExist(db, input, logOfferAdminError, CLIENT_WRITE_ERROR);
}

async function insertTargeting(
  db: SupabaseClient,
  offerId: string,
  input: AdminOfferUpsertInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.scope === "product") {
    const { error } = await db.from("offer_products").insert(
      input.productIds.map((product_id) => ({ offer_id: offerId, product_id }))
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const { error } = await db.from("offer_categories").insert(
    input.categoryIds.map((category_id) => ({ offer_id: offerId, category_id }))
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function clearTargeting(
  db: SupabaseClient,
  offerId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const products = await db.from("offer_products").delete().eq("offer_id", offerId);
  if (products.error) return { ok: false, error: products.error.message };
  const categories = await db.from("offer_categories").delete().eq("offer_id", offerId);
  if (categories.error) return { ok: false, error: categories.error.message };
  return { ok: true };
}

async function restoreTargeting(
  db: SupabaseClient,
  offerId: string,
  previous: OfferTargeting
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (previous.productIds.length > 0) {
    const { error } = await db.from("offer_products").insert(
      previous.productIds.map((product_id) => ({ offer_id: offerId, product_id }))
    );
    if (error && !isUniqueViolation(error)) {
      return { ok: false, error: error.message };
    }
  }
  if (previous.categoryIds.length > 0) {
    const { error } = await db.from("offer_categories").insert(
      previous.categoryIds.map((category_id) => ({ offer_id: offerId, category_id }))
    );
    if (error && !isUniqueViolation(error)) {
      return { ok: false, error: error.message };
    }
  }
  return { ok: true };
}

export function offerSnapshotWrite(row: AdminOfferRow) {
  return {
    name: row.name,
    description: row.description,
    discount_type: row.discount_type,
    discount_value: row.discount_value,
    scope: row.scope,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    is_enabled: row.is_enabled,
    banner_image_url: row.banner_image_url,
    updated_at: row.updated_at
  };
}

async function restoreOfferRow(
  db: SupabaseClient,
  snapshot: AdminOfferRow
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await db.from("offers").update(offerSnapshotWrite(snapshot)).eq("id", snapshot.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function recoverOfferState(
  db: SupabaseClient,
  snapshot: AdminOfferRow,
  previous: OfferTargeting
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cleared = await clearTargeting(db, snapshot.id);
  const restoredJoins = await restoreTargeting(db, snapshot.id, previous);
  const restoredRow = await restoreOfferRow(db, snapshot);

  if (cleared.ok && restoredJoins.ok && restoredRow.ok) {
    return { ok: true };
  }

  logOfferAdminError("patch_recovery_incomplete", {
    offerId: snapshot.id,
    clearOk: cleared.ok,
    clearError: cleared.ok ? null : cleared.error,
    joinsOk: restoredJoins.ok,
    joinsError: restoredJoins.ok ? null : restoredJoins.error,
    rowOk: restoredRow.ok,
    rowError: restoredRow.ok ? null : restoredRow.error
  });
  return { ok: false, error: CLIENT_RECOVERY_ERROR };
}

async function loadOfferRow(
  db: SupabaseClient,
  id: string
): Promise<
  { ok: true; row: AdminOfferRow } | { ok: false; error: string; status: 404 | 500 }
> {
  const { data, error } = await db.from("offers").select("*").eq("id", id).maybeSingle();
  if (error) {
    logOfferAdminError("load_offer_failed", { offerId: id, code: error.code, message: error.message });
    return { ok: false, error: CLIENT_READ_ERROR, status: 500 };
  }
  if (!data) {
    return { ok: false, error: "Offer not found", status: 404 };
  }
  const row = data as AdminOfferRow;
  return { ok: true, row: { ...row, banner_image_url: row.banner_image_url ?? null, ends_at: row.ends_at ?? null } };
}

export async function listAdminOffers(
  db: SupabaseClient,
  options: { status?: AdminOfferStatus; now?: Date } = {}
): Promise<
  { ok: true; offers: AdminOfferDto[] } | { ok: false; error: string; status: 500 }
> {
  const now = options.now ?? new Date();
  const { data, error } = await db.from("offers").select("*").order("created_at", { ascending: false });
  if (error) {
    logOfferAdminError("list_offers_failed", { code: error.code, message: error.message });
    return { ok: false, error: CLIENT_READ_ERROR, status: 500 };
  }

  const rows = (data ?? []) as AdminOfferRow[];
  const targeting = await loadTargeting(
    db,
    rows.map((row) => row.id)
  );
  if (!targeting.ok) {
    return { ok: false, error: targeting.error, status: 500 };
  }

  let offers = rows.map((row) =>
    toAdminOfferDto(row, targeting.targeting.get(row.id) ?? { productIds: [], categoryIds: [] }, now)
  );
  if (options.status) {
    offers = offers.filter((offer) => offer.status === options.status);
  }
  return { ok: true, offers };
}

export async function getAdminOffer(
  db: SupabaseClient,
  id: string,
  now: Date = new Date()
): Promise<{ ok: true; offer: AdminOfferDto } | { ok: false; error: string; status: 404 | 500 }> {
  const loaded = await loadOfferRow(db, id);
  if (!loaded.ok) return loaded;

  const targeting = await loadTargeting(db, [id]);
  if (!targeting.ok) {
    return { ok: false, error: targeting.error, status: 500 };
  }
  return {
    ok: true,
    offer: toAdminOfferDto(
      loaded.row,
      targeting.targeting.get(id) ?? { productIds: [], categoryIds: [] },
      now
    )
  };
}

export async function createAdminOffer(
  db: SupabaseClient,
  input: AdminOfferUpsertInput
): Promise<{ ok: true; offer: AdminOfferDto } | { ok: false; error: string; status: 400 | 500 }> {
  const exists = await assertTargetIdsExist(db, input);
  if (!exists.ok) return exists;

  const { data, error } = await db.from("offers").insert(offerWriteRow(input)).select("*").single();
  if (error || !data) {
    logOfferAdminError("create_offer_failed", {
      code: error?.code ?? null,
      message: error?.message ?? "missing insert row"
    });
    return { ok: false, error: CLIENT_WRITE_ERROR, status: 400 };
  }

  const row = data as AdminOfferRow;
  const targeting = await insertTargeting(db, row.id, input);
  if (!targeting.ok) {
    logOfferAdminError("create_targeting_failed", { offerId: row.id, message: targeting.error });
    const { error: cleanupError } = await db.from("offers").delete().eq("id", row.id);
    if (cleanupError) {
      logOfferAdminError("create_cleanup_failed", {
        offerId: row.id,
        code: cleanupError.code,
        message: cleanupError.message
      });
      return { ok: false, error: CLIENT_CREATE_CLEANUP_ERROR, status: 500 };
    }
    return { ok: false, error: CLIENT_TARGETING_ERROR, status: 400 };
  }

  return {
    ok: true,
    offer: toAdminOfferDto(row, { productIds: input.productIds, categoryIds: input.categoryIds })
  };
}

export async function updateAdminOffer(
  db: SupabaseClient,
  id: string,
  input: AdminOfferUpsertInput
): Promise<
  { ok: true; offer: AdminOfferDto } | { ok: false; error: string; status: 400 | 404 | 500 }
> {
  const loaded = await loadOfferRow(db, id);
  if (!loaded.ok) return loaded;
  const snapshot = loaded.row;

  const exists = await assertTargetIdsExist(db, input);
  if (!exists.ok) return exists;

  const previousMap = await loadTargeting(db, [id]);
  if (!previousMap.ok) {
    return { ok: false, error: previousMap.error, status: 500 };
  }
  const previous = previousMap.targeting.get(id) ?? { productIds: [], categoryIds: [] };

  const { error: updateError } = await db
    .from("offers")
    .update(offerWriteRow(input, new Date()))
    .eq("id", id);

  if (updateError) {
    logOfferAdminError("update_offer_failed", {
      offerId: id,
      code: updateError.code,
      message: updateError.message
    });
    return { ok: false, error: CLIENT_WRITE_ERROR, status: 400 };
  }

  const cleared = await clearTargeting(db, id);
  if (!cleared.ok) {
    logOfferAdminError("clear_targeting_failed", { offerId: id, message: cleared.error });
    const recovered = await recoverOfferState(db, snapshot, previous);
    if (!recovered.ok) {
      return { ok: false, error: recovered.error, status: 500 };
    }
    return { ok: false, error: CLIENT_TARGETING_ERROR, status: 400 };
  }

  const inserted = await insertTargeting(db, id, input);
  if (!inserted.ok) {
    logOfferAdminError("insert_targeting_failed", { offerId: id, message: inserted.error });
    const recovered = await recoverOfferState(db, snapshot, previous);
    if (!recovered.ok) {
      return { ok: false, error: recovered.error, status: 500 };
    }
    return { ok: false, error: CLIENT_TARGETING_ERROR, status: 400 };
  }

  const updated = await getAdminOffer(db, id);
  if (!updated.ok) return updated;
  return { ok: true, offer: updated.offer };
}

export async function deleteAdminOffer(
  db: SupabaseClient,
  id: string
): Promise<{ ok: true } | { ok: false; error: string; status: 400 | 404 | 500 }> {
  const loaded = await loadOfferRow(db, id);
  if (!loaded.ok) return loaded;

  const { error } = await db.from("offers").delete().eq("id", id);
  if (error) {
    logOfferAdminError("delete_offer_failed", { offerId: id, code: error.code, message: error.message });
    return { ok: false, error: CLIENT_WRITE_ERROR, status: 400 };
  }
  return { ok: true };
}
