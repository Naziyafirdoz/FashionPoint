/**
 * One-time migration: replace embedded base64 category homepage banners with Cloudinary HTTPS URLs.
 *
 * Categories only — updates homepage_banner_image_url in place.
 * Never deletes rows or images; never touches image_url or other columns.
 *
 * Usage (dry run — no uploads or DB writes):
 *   DRY_RUN=true npx tsx scripts/migrate-base64-category-banners-to-cloudinary.ts
 *
 * Usage (live):
 *   npx tsx scripts/migrate-base64-category-banners-to-cloudinary.ts
 *
 * Requires in .env.local (or environment):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const CLOUDINARY_FOLDER = "fashionpoint/categories";
const CLOUDINARY_ENV_KEYS = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET"
] as const;
const DRY_RUN = ["1", "true", "yes"].includes(
  (process.env.DRY_RUN ?? "").trim().toLowerCase()
);

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  homepage_banner_image_url: string | null;
};

type EnvConfig = {
  supabaseUrl: string;
  supabaseServiceKey: string;
};

type UploadCategoryBanner = (dataUrl: string) => Promise<string>;

let uploadCategoryBanner: UploadCategoryBanner;

function loadEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};

  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/** Load .env.local into process.env before importing @/lib/cloudinary. */
function hydrateProcessEnvFromLocalFile(): void {
  const fileEnv = loadEnvFile(resolve(process.cwd(), ".env.local"));
  for (const [key, value] of Object.entries(fileEnv)) {
    if (CLOUDINARY_ENV_KEYS.includes(key as (typeof CLOUDINARY_ENV_KEYS)[number])) {
      // Always trust .env.local for Cloudinary — stale shell exports cause Invalid Signature (401).
      process.env[key] = value;
      continue;
    }

    if (process.env[key] == null || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

function readEnv(): EnvConfig {
  hydrateProcessEnvFromLocalFile();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

  const missing: string[] = [];
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseServiceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return { supabaseUrl, supabaseServiceKey };
}

function isBase64DataImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();
  return lower.startsWith("data:image/") && lower.includes("base64");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function logCloudinaryUploadError(error: unknown): void {
  console.error("Cloudinary upload failed");
  console.error(error);

  if (error instanceof Error) {
    console.error("message:", error.message);
    console.error("name:", error.name);
    if (error.stack) console.error("stack:", error.stack);
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;

    if (!(error instanceof Error) && record.message !== undefined) {
      console.error("message:", record.message);
    }
    if (record.http_code !== undefined) console.error("http_code:", record.http_code);
    if (!(error instanceof Error) && record.name !== undefined) {
      console.error("name:", record.name);
    }
    if (!(error instanceof Error) && record.stack !== undefined) {
      console.error("stack:", record.stack);
    }
    if (record.error !== undefined) console.error("error:", record.error);

    try {
      console.error(
        "serialized:",
        JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      );
    } catch {
      console.error("serialized: [unable to JSON.stringify error]");
    }
  }
}

async function verifyCloudinaryCredentials(
  uploadImage: (file: string, folder?: string) => Promise<string | null>
): Promise<void> {
  const probe =
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==";

  try {
    const url = await uploadImage(probe, CLOUDINARY_FOLDER);
    if (!url) {
      throw new Error("Cloudinary upload returned no URL");
    }
    console.log("Cloudinary credentials verified.");
  } catch (error) {
    console.error("Cloudinary credential check failed before migration.");
    logCloudinaryUploadError(error);
    throw error;
  }
}

async function uploadBase64ToCloudinary(
  dataUrl: string,
  publicId: string
): Promise<string> {
  void publicId;
  return uploadCategoryBanner(dataUrl);
}

async function migrateCategoryBanner(
  category: CategoryRow
): Promise<{ nextBannerUrl: string; migratedCount: number }> {
  const banner = category.homepage_banner_image_url?.trim() ?? "";

  if (!banner || !isBase64DataImageUrl(banner)) {
    return { nextBannerUrl: banner, migratedCount: 0 };
  }

  const safeSlug = category.slug.replace(/[^a-z0-9-]+/gi, "-").replace(/-+/g, "-");
  const publicId = `migrated-${safeSlug}-${category.id.slice(0, 8)}-banner`;

  if (DRY_RUN) {
    console.log(
      `  [dry-run] would upload homepage_banner_image_url (${formatBytes(banner.length)}) → ${CLOUDINARY_FOLDER}/${publicId}`
    );
    return { nextBannerUrl: banner, migratedCount: 1 };
  }

  try {
    const secureUrl = await uploadBase64ToCloudinary(banner, publicId);
    console.log(`  uploaded homepage_banner_image_url → ${secureUrl}`);
    return { nextBannerUrl: secureUrl, migratedCount: 1 };
  } catch (error) {
    console.error("Cloudinary upload failed for homepage_banner_image_url");
    logCloudinaryUploadError(error);
    throw error;
  }
}

async function fetchCategoriesWithBase64Banners(db: SupabaseClient): Promise<CategoryRow[]> {
  const { data, error } = await db
    .from("categories")
    .select("id, name, slug, homepage_banner_image_url")
    .order("homepage_display_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load categories: ${error.message}`);
  }

  return (data ?? []).filter((row) => {
    const banner = row.homepage_banner_image_url;
    return typeof banner === "string" && isBase64DataImageUrl(banner);
  }) as CategoryRow[];
}

async function main(): Promise<void> {
  const env = readEnv();

  const { uploadImage, isCloudinaryConfigured } = await import("../src/lib/cloudinary");

  if (!isCloudinaryConfigured) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.local."
    );
  }

  uploadCategoryBanner = async (dataUrl: string) => {
    const url = await uploadImage(dataUrl, CLOUDINARY_FOLDER);
    if (!url) {
      throw new Error("Cloudinary upload returned no URL");
    }
    return url;
  };

  console.log(DRY_RUN ? "=== DRY RUN (no uploads, no DB writes) ===" : "=== LIVE MIGRATION ===");
  console.log(`Cloudinary folder: ${CLOUDINARY_FOLDER}`);

  if (!DRY_RUN) {
    await verifyCloudinaryCredentials(uploadImage);
  }

  const db = createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const categories = await fetchCategoriesWithBase64Banners(db);
  console.log(`Found ${categories.length} categor(ies) with base64 homepage banners.\n`);

  if (categories.length === 0) {
    console.log("Nothing to migrate.");
    return;
  }

  const updatedCategories: Array<{ id: string; name: string; migratedBanners: number }> = [];
  let failed = 0;

  for (const category of categories) {
    const banner = category.homepage_banner_image_url?.trim() ?? "";
    const hasBase64Banner = isBase64DataImageUrl(banner);

    console.log(`Category: ${category.name} (${category.id})`);
    console.log(`  slug: ${category.slug}`);
    console.log(`  base64 homepage_banner_image_url: ${hasBase64Banner ? "yes" : "no"}`);

    let result: { nextBannerUrl: string; migratedCount: number };
    try {
      result = await migrateCategoryBanner(category);
    } catch {
      failed += 1;
      console.error("  skipped — Cloudinary upload failed\n");
      continue;
    }

    if (result.migratedCount === 0) {
      console.log("  no changes needed.\n");
      continue;
    }

    if (DRY_RUN) {
      updatedCategories.push({
        id: category.id,
        name: category.name,
        migratedBanners: result.migratedCount
      });
      console.log(
        `  [dry-run] would update categories.homepage_banner_image_url (${result.migratedCount} slot(s))\n`
      );
      continue;
    }

    const { error: updateError } = await db
      .from("categories")
      .update({ homepage_banner_image_url: result.nextBannerUrl })
      .eq("id", category.id);

    if (updateError) {
      failed += 1;
      console.error(`  skipped — Supabase update failed: ${updateError.message}\n`);
      continue;
    }

    updatedCategories.push({
      id: category.id,
      name: category.name,
      migratedBanners: result.migratedCount
    });
    console.log(
      `  updated categories.homepage_banner_image_url (${result.migratedCount} slot(s))\n`
    );
  }

  console.log("--- Summary ---");
  if (updatedCategories.length === 0) {
    console.log(DRY_RUN ? "No categories would be updated." : "No categories were updated.");
  } else {
    console.log(DRY_RUN ? "Categories that would be updated:" : "Updated categories:");
    for (const row of updatedCategories) {
      console.log(`  - ${row.id} | ${row.name} | ${row.migratedBanners} banner(s)`);
    }
  }

  if (failed > 0) {
    console.log(`\n${failed} categor(ies) failed or were skipped.`);
    process.exitCode = 1;
  }

  if (DRY_RUN) {
    console.log("\nRe-run without DRY_RUN=true to apply changes.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
