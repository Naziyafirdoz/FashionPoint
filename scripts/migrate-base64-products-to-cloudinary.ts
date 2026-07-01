/**
 * One-time migration: replace embedded base64 product images with Cloudinary HTTPS URLs.
 *
 * Products only — categories are not modified.
 * Never deletes rows or images; only updates products.images in place.
 *
 * Usage (dry run — no uploads or DB writes):
 *   DRY_RUN=true npx tsx scripts/migrate-base64-products-to-cloudinary.ts
 *
 * Usage (live):
 *   npx tsx scripts/migrate-base64-products-to-cloudinary.ts
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

const CLOUDINARY_FOLDER = "fashionpoint/products";
const CLOUDINARY_ENV_KEYS = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET"
] as const;
const DRY_RUN = ["1", "true", "yes"].includes(
  (process.env.DRY_RUN ?? "").trim().toLowerCase()
);

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  images: string[] | null;
};

type EnvConfig = {
  supabaseUrl: string;
  supabaseServiceKey: string;
};

type UploadProductImage = (dataUrl: string) => Promise<string>;

let uploadProductImage: UploadProductImage;

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
  return uploadProductImage(dataUrl);
}

async function migrateProductImages(
  product: ProductRow
): Promise<{ nextImages: string[]; migratedCount: number } | { error: string }> {
  const images = Array.isArray(product.images) ? product.images : [];
  if (images.length === 0) {
    return { nextImages: images, migratedCount: 0 };
  }

  const nextImages: string[] = [];
  let migratedCount = 0;

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];

    if (typeof image !== "string" || !image.trim()) {
      nextImages.push(image);
      continue;
    }

    if (!isBase64DataImageUrl(image)) {
      nextImages.push(image);
      continue;
    }

    const safeSlug = product.slug.replace(/[^a-z0-9-]+/gi, "-").replace(/-+/g, "-");
    const publicId = `migrated-${safeSlug}-${product.id.slice(0, 8)}-${index + 1}`;

    if (DRY_RUN) {
      console.log(
        `  [dry-run] would upload image ${index + 1}/${images.length} (${formatBytes(image.length)}) → ${CLOUDINARY_FOLDER}/${publicId}`
      );
      nextImages.push(image);
      migratedCount += 1;
      continue;
    }

    try {
      const secureUrl = await uploadBase64ToCloudinary(image, publicId);
      nextImages.push(secureUrl);
      migratedCount += 1;
      console.log(`  uploaded image ${index + 1}/${images.length} → ${secureUrl}`);
    } catch (error) {
      console.error(`Cloudinary upload failed for image ${index + 1}/${images.length}`);
      logCloudinaryUploadError(error);
      throw error;
    }
  }

  return { nextImages, migratedCount };
}

async function fetchProductsWithBase64Images(db: SupabaseClient): Promise<ProductRow[]> {
  const { data, error } = await db
    .from("products")
    .select("id, name, slug, images")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load products: ${error.message}`);
  }

  return (data ?? []).filter((row) => {
    const images = Array.isArray(row.images) ? row.images : [];
    return images.some((img) => typeof img === "string" && isBase64DataImageUrl(img));
  }) as ProductRow[];
}

async function main(): Promise<void> {
  const env = readEnv();

  const { uploadImage, isCloudinaryConfigured } = await import("../src/lib/cloudinary");

  if (!isCloudinaryConfigured) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.local."
    );
  }

  uploadProductImage = async (dataUrl: string) => {
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

  const products = await fetchProductsWithBase64Images(db);
  console.log(`Found ${products.length} product(s) with base64 images.\n`);

  if (products.length === 0) {
    console.log("Nothing to migrate.");
    return;
  }

  const updatedProducts: Array<{ id: string; name: string; migratedImages: number }> = [];
  let failed = 0;

  for (const product of products) {
    const images = Array.isArray(product.images) ? product.images : [];
    const base64Count = images.filter(
      (img) => typeof img === "string" && isBase64DataImageUrl(img)
    ).length;

    console.log(`Product: ${product.name} (${product.id})`);
    console.log(`  slug: ${product.slug}`);
    console.log(`  base64 images: ${base64Count}/${images.length}`);

    const result = await migrateProductImages(product);

    if ("error" in result) {
      failed += 1;
      console.error(`  skipped — ${result.error}\n`);
      continue;
    }

    if (result.migratedCount === 0) {
      console.log("  no changes needed.\n");
      continue;
    }

    if (DRY_RUN) {
      updatedProducts.push({
        id: product.id,
        name: product.name,
        migratedImages: result.migratedCount
      });
      console.log(`  [dry-run] would update products.images (${result.migratedCount} slot(s))\n`);
      continue;
    }

    const { error: updateError } = await db
      .from("products")
      .update({ images: result.nextImages })
      .eq("id", product.id);

    if (updateError) {
      failed += 1;
      console.error(`  skipped — Supabase update failed: ${updateError.message}\n`);
      continue;
    }

    updatedProducts.push({
      id: product.id,
      name: product.name,
      migratedImages: result.migratedCount
    });
    console.log(`  updated products.images (${result.migratedCount} slot(s))\n`);
  }

  console.log("--- Summary ---");
  if (updatedProducts.length === 0) {
    console.log(DRY_RUN ? "No products would be updated." : "No products were updated.");
  } else {
    console.log(DRY_RUN ? "Products that would be updated:" : "Updated products:");
    for (const row of updatedProducts) {
      console.log(`  - ${row.id} | ${row.name} | ${row.migratedImages} image(s)`);
    }
  }

  if (failed > 0) {
    console.log(`\n${failed} product(s) failed or were skipped.`);
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
