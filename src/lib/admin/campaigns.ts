import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertCatalogTargetIdsExist,
  isCatalogTargetScope,
  parseCatalogTargeting,
  type CatalogTargetScope,
  type CatalogTargeting
} from "@/lib/admin/catalog-targeting";
import {
  parseCampaignContentStyle,
  parseCampaignContentStyleForAdmin,
  type CampaignContentStyle
} from "@/lib/campaigns/campaign-hero-content-style";
import {
  isSafeInternalCtaUrl,
  type HomepageHeroDisplayMode
} from "@/lib/campaigns/homepage-hero-campaign";

export type AdminCampaignStatus = "disabled" | "scheduled" | "active" | "expired";

export type AdminCampaignRow = {
  id: string;
  name: string;
  occasion: string | null;
  display_mode: HomepageHeroDisplayMode;
  scope: CatalogTargetScope | null;
  is_enabled: boolean;
  hero_image_url: string;
  mobile_image_url: string | null;
  heading: string | null;
  subheading: string | null;
  offer_text: string | null;
  cta_text: string | null;
  cta_url: string | null;
  content_style?: unknown;
  starts_at: string;
  ends_at: string;
  priority: number;
  created_at: string;
  updated_at: string;
};

export type AdminCampaignDto = {
  id: string;
  name: string;
  occasion: string | null;
  displayMode: HomepageHeroDisplayMode;
  scope: CatalogTargetScope | null;
  isEnabled: boolean;
  heroImageUrl: string;
  mobileImageUrl: string | null;
  heading: string | null;
  subheading: string | null;
  offerText: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  contentStyle: CampaignContentStyle | null;
  productIds: string[];
  categoryIds: string[];
  startsAt: string;
  endsAt: string;
  priority: number;
  status: AdminCampaignStatus;
  createdAt: string;
  updatedAt: string;
};

export type AdminCampaignUpsertInput = {
  name: string;
  occasion: string | null;
  displayMode: HomepageHeroDisplayMode;
  scope: CatalogTargetScope;
  isEnabled: boolean;
  heroImageUrl: string;
  mobileImageUrl: string | null;
  heading: string | null;
  subheading: string | null;
  offerText: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  contentStyle: CampaignContentStyle | null;
  productIds: string[];
  categoryIds: string[];
  startsAt: Date;
  endsAt: Date;
  priority: number;
};

export const CAMPAIGN_OCCASIONS = [
  "Eid",
  "Sankranti",
  "Diwali",
  "Wedding",
  "Sale",
  "Other"
] as const;

export type CampaignOccasion = (typeof CAMPAIGN_OCCASIONS)[number];

const DISPLAY_MODES = new Set<HomepageHeroDisplayMode>(["image_only", "image_with_content"]);
const STATUSES = new Set<AdminCampaignStatus>(["disabled", "scheduled", "active", "expired"]);
const OCCASION_SET = new Set<string>(CAMPAIGN_OCCASIONS);

const CLIENT_READ_ERROR = "Unable to load campaigns. Please try again.";
const CLIENT_WRITE_ERROR = "Unable to save this campaign. Please try again.";
const CLIENT_TARGETING_ERROR = "Unable to save campaign targeting. Please try again.";
const CLIENT_CREATE_CLEANUP_ERROR =
  "Campaign creation failed and automatic cleanup also failed. Please try again.";
const CLIENT_RECOVERY_ERROR =
  "The campaign update failed and recovery was incomplete. Please try again.";
const CAMPAIGN_SELECT =
  "id, name, occasion, display_mode, scope, is_enabled, hero_image_url, mobile_image_url, heading, subheading, offer_text, cta_text, cta_url, content_style, starts_at, ends_at, priority, created_at, updated_at";

export function isPredefinedCampaignOccasion(value: string): value is CampaignOccasion {
  return OCCASION_SET.has(value);
}

function logCampaignAdminError(event: string, details: Record<string, unknown>) {
  console.error("[admin/campaigns]", event, details);
}

export function isAdminCampaignStatus(value: string): value is AdminCampaignStatus {
  return STATUSES.has(value as AdminCampaignStatus);
}

export function isHomepageHeroDisplayMode(value: string): value is HomepageHeroDisplayMode {
  return DISPLAY_MODES.has(value as HomepageHeroDisplayMode);
}

export function deriveCampaignStatus(
  campaign: { isEnabled: boolean; startsAt: Date | string; endsAt: Date | string },
  now: Date = new Date()
): AdminCampaignStatus {
  if (!campaign.isEnabled) return "disabled";

  const startsAt = campaign.startsAt instanceof Date ? campaign.startsAt : new Date(campaign.startsAt);
  const endsAt = campaign.endsAt instanceof Date ? campaign.endsAt : new Date(campaign.endsAt);
  const nowMs = now.getTime();

  if (nowMs < startsAt.getTime()) return "scheduled";
  if (nowMs > endsAt.getTime()) return "expired";
  return "active";
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseRequiredDate(value: unknown, field: string): { ok: true; date: Date } | { ok: false; error: string } {
  if (value == null || value === "") {
    return { ok: false, error: `${field} is required` };
  }

  const date = value instanceof Date ? value : new Date(typeof value === "string" ? value : String(value));
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: `${field} must be a valid date` };
  }
  return { ok: true, date };
}

function referencesDefaultHeroAssets(value: string): boolean {
  return value.toLowerCase().includes("/assets/hero/");
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function parseCampaignImageUrl(
  value: unknown,
  field: string,
  required: boolean
): { ok: true; url: string | null } | { ok: false; error: string } {
  const trimmed = asTrimmedString(value);
  if (!trimmed) {
    if (required) return { ok: false, error: `${field} is required` };
    return { ok: true, url: null };
  }
  if (!isHttpUrl(trimmed) || referencesDefaultHeroAssets(trimmed)) {
    return {
      ok: false,
      error: `${field} must be an HTTP(S) URL that does not use default hero assets`
    };
  }
  return { ok: true, url: trimmed };
}

function parsePriority(value: unknown): { ok: true; priority: number } | { ok: false; error: string } {
  if (value == null || value === "") return { ok: true, priority: 0 };
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed)) {
    return { ok: false, error: "priority must be an integer" };
  }
  return { ok: true, priority: parsed };
}

export function parseCampaignUpsertInput(
  body: unknown
): { ok: true; input: AdminCampaignUpsertInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid campaign payload" };
  }

  const row = body as Record<string, unknown>;
  const name = asTrimmedString(row.name);
  if (!name) {
    return { ok: false, error: "Name is required" };
  }

  const occasionRaw = asTrimmedString(row.occasion);
  if (occasionRaw && (occasionRaw.toLowerCase() === "custom" || occasionRaw === "__custom__")) {
    return { ok: false, error: "Enter the actual custom occasion name" };
  }

  const displayModeRaw =
    typeof row.displayMode === "string"
      ? row.displayMode
      : typeof row.display_mode === "string"
        ? row.display_mode
        : "";
  if (!isHomepageHeroDisplayMode(displayModeRaw)) {
    return { ok: false, error: "displayMode must be image_only or image_with_content" };
  }

  const heroResult = parseCampaignImageUrl(row.heroImageUrl ?? row.hero_image_url, "heroImageUrl", true);
  if (!heroResult.ok) return heroResult;
  const mobileResult = parseCampaignImageUrl(
    row.mobileImageUrl ?? row.mobile_image_url,
    "mobileImageUrl",
    false
  );
  if (!mobileResult.ok) return mobileResult;

  const heading = asTrimmedString(row.heading);
  if (displayModeRaw === "image_with_content" && !heading) {
    return { ok: false, error: "Heading is required for Image + Content campaigns" };
  }

  const subheading = asTrimmedString(row.subheading);
  const offerText = asTrimmedString(row.offerText ?? row.offer_text);
  const ctaText = asTrimmedString(row.ctaText ?? row.cta_text);
  const ctaUrl = asTrimmedString(row.ctaUrl ?? row.cta_url);
  if (Boolean(ctaText) !== Boolean(ctaUrl)) {
    return { ok: false, error: "CTA text and CTA URL must both be provided, or both left empty" };
  }
  if (ctaUrl && !isSafeInternalCtaUrl(ctaUrl)) {
    return { ok: false, error: "CTA URL must be an internal path starting with /" };
  }

  const contentStyleResult = parseCampaignContentStyleForAdmin(row.contentStyle ?? row.content_style);
  if (!contentStyleResult.ok) return contentStyleResult;

  const targeting = parseCatalogTargeting(row, "campaign");
  if (!targeting.ok) return targeting;

  const startsAtResult = parseRequiredDate(row.startsAt ?? row.starts_at, "startsAt");
  if (!startsAtResult.ok) return startsAtResult;
  const endsAtResult = parseRequiredDate(row.endsAt ?? row.ends_at, "endsAt");
  if (!endsAtResult.ok) return endsAtResult;
  if (endsAtResult.date.getTime() <= startsAtResult.date.getTime()) {
    return { ok: false, error: "endsAt must be later than startsAt" };
  }

  const isEnabledRaw = row.isEnabled ?? row.is_enabled;
  if (isEnabledRaw != null && typeof isEnabledRaw !== "boolean") {
    return { ok: false, error: "isEnabled must be a boolean" };
  }

  const priorityResult = parsePriority(row.priority);
  if (!priorityResult.ok) return priorityResult;

  return {
    ok: true,
    input: {
      name,
      occasion: occasionRaw,
      displayMode: displayModeRaw,
      isEnabled: isEnabledRaw === true,
      heroImageUrl: heroResult.url as string,
      mobileImageUrl: mobileResult.url,
      heading,
      subheading,
      offerText,
      ctaText,
      ctaUrl,
      contentStyle: contentStyleResult.style,
      scope: targeting.targeting.scope,
      productIds: targeting.targeting.productIds,
      categoryIds: targeting.targeting.categoryIds,
      startsAt: startsAtResult.date,
      endsAt: endsAtResult.date,
      priority: priorityResult.priority
    }
  };
}

export function toAdminCampaignDto(
  row: AdminCampaignRow,
  targeting: CatalogTargeting = { productIds: [], categoryIds: [] },
  now: Date = new Date()
): AdminCampaignDto {
  return {
    id: row.id,
    name: row.name,
    occasion: row.occasion,
    displayMode: row.display_mode,
    scope: typeof row.scope === "string" && isCatalogTargetScope(row.scope) ? row.scope : null,
    isEnabled: row.is_enabled === true,
    heroImageUrl: row.hero_image_url,
    mobileImageUrl: row.mobile_image_url,
    heading: row.heading,
    subheading: row.subheading,
    offerText: row.offer_text,
    ctaText: row.cta_text,
    ctaUrl: row.cta_url,
    contentStyle: parseCampaignContentStyle(row.content_style),
    productIds: targeting.productIds,
    categoryIds: targeting.categoryIds,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    priority: row.priority,
    status: deriveCampaignStatus(
      { isEnabled: row.is_enabled === true, startsAt: row.starts_at, endsAt: row.ends_at },
      now
    ),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function campaignWriteRow(input: AdminCampaignUpsertInput, updatedAt?: Date) {
  const row: Record<string, unknown> = {
    name: input.name,
    occasion: input.occasion,
    display_mode: input.displayMode,
    scope: input.scope,
    is_enabled: input.isEnabled,
    hero_image_url: input.heroImageUrl,
    mobile_image_url: input.mobileImageUrl,
    heading: input.heading,
    subheading: input.subheading,
    offer_text: input.offerText,
    cta_text: input.ctaText,
    cta_url: input.ctaUrl,
    content_style: input.contentStyle,
    starts_at: input.startsAt.toISOString(),
    ends_at: input.endsAt.toISOString(),
    priority: input.priority
  };
  if (updatedAt) row.updated_at = updatedAt.toISOString();
  return row;
}

async function loadCampaignRow(
  db: SupabaseClient,
  id: string
): Promise<{ ok: true; row: AdminCampaignRow } | { ok: false; error: string; status: 404 | 500 }> {
  const { data, error } = await db
    .from("homepage_hero_campaigns")
    .select(CAMPAIGN_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logCampaignAdminError("load_campaign_failed", { campaignId: id, code: error.code, message: error.message });
    return { ok: false, error: CLIENT_READ_ERROR, status: 500 };
  }
  if (!data) {
    return { ok: false, error: "Campaign not found", status: 404 };
  }
  return { ok: true, row: data as AdminCampaignRow };
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

function emptyTargeting(): CatalogTargeting {
  return { productIds: [], categoryIds: [] };
}

async function loadCampaignTargeting(
  db: SupabaseClient,
  campaignIds: string[]
): Promise<{ ok: true; targeting: Map<string, CatalogTargeting> } | { ok: false; error: string }> {
  const targeting = new Map<string, CatalogTargeting>();
  for (const id of campaignIds) {
    targeting.set(id, emptyTargeting());
  }
  if (campaignIds.length === 0) return { ok: true, targeting };

  const [productResult, categoryResult] = await Promise.all([
    db.from("campaign_products").select("campaign_id, product_id").in("campaign_id", campaignIds),
    db.from("campaign_categories").select("campaign_id, category_id").in("campaign_id", campaignIds)
  ]);

  if (productResult.error || categoryResult.error) {
    logCampaignAdminError("load_targeting_failed", {
      campaignIds,
      productCode: productResult.error?.code ?? null,
      categoryCode: categoryResult.error?.code ?? null,
      productMessage: productResult.error?.message ?? null,
      categoryMessage: categoryResult.error?.message ?? null
    });
    return { ok: false, error: CLIENT_READ_ERROR };
  }

  for (const row of productResult.data ?? []) {
    targeting.get(row.campaign_id as string)?.productIds.push(row.product_id as string);
  }
  for (const row of categoryResult.data ?? []) {
    targeting.get(row.campaign_id as string)?.categoryIds.push(row.category_id as string);
  }

  return { ok: true, targeting };
}

async function insertCampaignTargeting(
  db: SupabaseClient,
  campaignId: string,
  input: AdminCampaignUpsertInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.scope === "product") {
    const { error } = await db.from("campaign_products").insert(
      input.productIds.map((product_id) => ({ campaign_id: campaignId, product_id }))
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const { error } = await db.from("campaign_categories").insert(
    input.categoryIds.map((category_id) => ({ campaign_id: campaignId, category_id }))
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function clearCampaignTargeting(
  db: SupabaseClient,
  campaignId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const products = await db.from("campaign_products").delete().eq("campaign_id", campaignId);
  if (products.error) return { ok: false, error: products.error.message };
  const categories = await db.from("campaign_categories").delete().eq("campaign_id", campaignId);
  if (categories.error) return { ok: false, error: categories.error.message };
  return { ok: true };
}

async function restoreCampaignTargeting(
  db: SupabaseClient,
  campaignId: string,
  previous: CatalogTargeting
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (previous.productIds.length > 0) {
    const { error } = await db.from("campaign_products").insert(
      previous.productIds.map((product_id) => ({ campaign_id: campaignId, product_id }))
    );
    if (error && !isUniqueViolation(error)) {
      return { ok: false, error: error.message };
    }
  }
  if (previous.categoryIds.length > 0) {
    const { error } = await db.from("campaign_categories").insert(
      previous.categoryIds.map((category_id) => ({ campaign_id: campaignId, category_id }))
    );
    if (error && !isUniqueViolation(error)) {
      return { ok: false, error: error.message };
    }
  }
  return { ok: true };
}

function campaignSnapshotWrite(row: AdminCampaignRow) {
  return {
    name: row.name,
    occasion: row.occasion,
    display_mode: row.display_mode,
    scope: row.scope,
    is_enabled: row.is_enabled,
    hero_image_url: row.hero_image_url,
    mobile_image_url: row.mobile_image_url,
    heading: row.heading,
    subheading: row.subheading,
    offer_text: row.offer_text,
    cta_text: row.cta_text,
    cta_url: row.cta_url,
    content_style: row.content_style ?? null,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    priority: row.priority,
    updated_at: row.updated_at
  };
}

async function recoverCampaignState(
  db: SupabaseClient,
  snapshot: AdminCampaignRow,
  previous: CatalogTargeting
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cleared = await clearCampaignTargeting(db, snapshot.id);
  const restoredJoins = await restoreCampaignTargeting(db, snapshot.id, previous);
  const { error: rowError } = await db
    .from("homepage_hero_campaigns")
    .update(campaignSnapshotWrite(snapshot))
    .eq("id", snapshot.id);

  if (cleared.ok && restoredJoins.ok && !rowError) {
    return { ok: true };
  }

  logCampaignAdminError("patch_recovery_incomplete", {
    campaignId: snapshot.id,
    clearOk: cleared.ok,
    clearError: cleared.ok ? null : cleared.error,
    joinsOk: restoredJoins.ok,
    joinsError: restoredJoins.ok ? null : restoredJoins.error,
    rowOk: !rowError,
    rowError: rowError?.message ?? null
  });
  return { ok: false, error: CLIENT_RECOVERY_ERROR };
}

export async function listAdminCampaigns(
  db: SupabaseClient,
  options: { status?: AdminCampaignStatus; now?: Date } = {}
): Promise<{ ok: true; campaigns: AdminCampaignDto[] } | { ok: false; error: string; status: 500 }> {
  const now = options.now ?? new Date();
  const { data, error } = await db
    .from("homepage_hero_campaigns")
    .select(CAMPAIGN_SELECT)
    .order("priority", { ascending: false })
    .order("starts_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    logCampaignAdminError("list_campaigns_failed", { code: error.code, message: error.message });
    return { ok: false, error: CLIENT_READ_ERROR, status: 500 };
  }

  const rows = (data ?? []) as AdminCampaignRow[];
  const targeting = await loadCampaignTargeting(
    db,
    rows.map((row) => row.id)
  );
  if (!targeting.ok) {
    return { ok: false, error: targeting.error, status: 500 };
  }

  let campaigns = rows.map((row) =>
    toAdminCampaignDto(row, targeting.targeting.get(row.id) ?? emptyTargeting(), now)
  );
  if (options.status) {
    campaigns = campaigns.filter((campaign) => campaign.status === options.status);
  }
  return { ok: true, campaigns };
}

export async function getAdminCampaign(
  db: SupabaseClient,
  id: string,
  now: Date = new Date()
): Promise<{ ok: true; campaign: AdminCampaignDto } | { ok: false; error: string; status: 404 | 500 }> {
  const loaded = await loadCampaignRow(db, id);
  if (!loaded.ok) return loaded;

  const targeting = await loadCampaignTargeting(db, [id]);
  if (!targeting.ok) {
    return { ok: false, error: targeting.error, status: 500 };
  }
  return {
    ok: true,
    campaign: toAdminCampaignDto(
      loaded.row,
      targeting.targeting.get(id) ?? emptyTargeting(),
      now
    )
  };
}

export async function createAdminCampaign(
  db: SupabaseClient,
  input: AdminCampaignUpsertInput
): Promise<{ ok: true; campaign: AdminCampaignDto } | { ok: false; error: string; status: 400 | 500 }> {
  const exists = await assertCatalogTargetIdsExist(db, input, logCampaignAdminError, CLIENT_WRITE_ERROR);
  if (!exists.ok) return exists;

  const { data, error } = await db
    .from("homepage_hero_campaigns")
    .insert(campaignWriteRow(input))
    .select(CAMPAIGN_SELECT)
    .single();

  if (error || !data) {
    logCampaignAdminError("create_campaign_failed", {
      code: error?.code ?? null,
      message: error?.message ?? "missing insert row"
    });
    return { ok: false, error: CLIENT_WRITE_ERROR, status: 400 };
  }

  const row = data as AdminCampaignRow;
  const targeting = await insertCampaignTargeting(db, row.id, input);
  if (!targeting.ok) {
    logCampaignAdminError("create_targeting_failed", { campaignId: row.id, message: targeting.error });
    const { error: cleanupError } = await db.from("homepage_hero_campaigns").delete().eq("id", row.id);
    if (cleanupError) {
      logCampaignAdminError("create_cleanup_failed", {
        campaignId: row.id,
        code: cleanupError.code,
        message: cleanupError.message
      });
      return { ok: false, error: CLIENT_CREATE_CLEANUP_ERROR, status: 500 };
    }
    return { ok: false, error: CLIENT_TARGETING_ERROR, status: 400 };
  }

  return {
    ok: true,
    campaign: toAdminCampaignDto(row, { productIds: input.productIds, categoryIds: input.categoryIds })
  };
}

export async function updateAdminCampaign(
  db: SupabaseClient,
  id: string,
  input: AdminCampaignUpsertInput
): Promise<
  { ok: true; campaign: AdminCampaignDto } | { ok: false; error: string; status: 400 | 404 | 500 }
> {
  const loaded = await loadCampaignRow(db, id);
  if (!loaded.ok) return loaded;
  const snapshot = loaded.row;

  const exists = await assertCatalogTargetIdsExist(db, input, logCampaignAdminError, CLIENT_WRITE_ERROR);
  if (!exists.ok) return exists;

  const previousMap = await loadCampaignTargeting(db, [id]);
  if (!previousMap.ok) {
    return { ok: false, error: previousMap.error, status: 500 };
  }
  const previous = previousMap.targeting.get(id) ?? emptyTargeting();

  const { error: updateError } = await db
    .from("homepage_hero_campaigns")
    .update(campaignWriteRow(input, new Date()))
    .eq("id", id);

  if (updateError) {
    logCampaignAdminError("update_campaign_failed", {
      campaignId: id,
      code: updateError.code,
      message: updateError.message
    });
    return { ok: false, error: CLIENT_WRITE_ERROR, status: 400 };
  }

  const cleared = await clearCampaignTargeting(db, id);
  if (!cleared.ok) {
    logCampaignAdminError("clear_targeting_failed", { campaignId: id, message: cleared.error });
    const recovered = await recoverCampaignState(db, snapshot, previous);
    if (!recovered.ok) {
      return { ok: false, error: recovered.error, status: 500 };
    }
    return { ok: false, error: CLIENT_TARGETING_ERROR, status: 400 };
  }

  const inserted = await insertCampaignTargeting(db, id, input);
  if (!inserted.ok) {
    logCampaignAdminError("insert_targeting_failed", { campaignId: id, message: inserted.error });
    const recovered = await recoverCampaignState(db, snapshot, previous);
    if (!recovered.ok) {
      return { ok: false, error: recovered.error, status: 500 };
    }
    return { ok: false, error: CLIENT_TARGETING_ERROR, status: 400 };
  }

  return getAdminCampaign(db, id);
}

export async function deleteAdminCampaign(
  db: SupabaseClient,
  id: string
): Promise<{ ok: true } | { ok: false; error: string; status: 400 | 404 | 500 }> {
  const loaded = await loadCampaignRow(db, id);
  if (!loaded.ok) return loaded;

  const { error } = await db.from("homepage_hero_campaigns").delete().eq("id", id);
  if (error) {
    logCampaignAdminError("delete_campaign_failed", {
      campaignId: id,
      code: error.code,
      message: error.message
    });
    return { ok: false, error: CLIENT_WRITE_ERROR, status: 400 };
  }
  return { ok: true };
}
