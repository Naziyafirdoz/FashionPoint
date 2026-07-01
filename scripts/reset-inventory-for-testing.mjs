/**
 * Reset inventory data for testing — does not delete products, orders, customers, or reviews.
 *
 * - Deletes rows from dedicated inventory/audit tables when they exist (skipped if missing).
 * - Sets product_variants.stock_quantity and products.stock_quantity to 0 (variants kept).
 *
 * Usage (preview):
 *   DRY_RUN=true node scripts/reset-inventory-for-testing.mjs
 *
 * Usage (live):
 *   node scripts/reset-inventory-for-testing.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const NIL_UUID = "00000000-0000-0000-0000-000000000000";
const DRY_RUN = ["1", "true", "yes"].includes(
  (process.env.DRY_RUN ?? "").trim().toLowerCase()
);

/** Dedicated inventory tables — skipped automatically when not in schema. */
const INVENTORY_DELETE_TABLE_CANDIDATES = [
  "inventory",
  "inventory_transactions",
  "stock_movements",
  "inventory_logs",
  "inventory_history",
  "inventory_adjustments",
  "inventory_audit",
  "inventory_audit_log",
  "inventory_audits",
  "inventory_cache",
  "inventory_caches"
];

const PRESERVED_TABLES = [
  "products",
  "categories",
  "sub_categories",
  "orders",
  "customers",
  "reviews"
];

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
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

function mergeEnv() {
  const fileEnv = loadEnvFile(resolve(process.cwd(), ".env.local"));
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? fileEnv.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? fileEnv.SUPABASE_SERVICE_ROLE_KEY
  };
}

function isMissingTableError(message) {
  const lower = String(message).toLowerCase();
  return (
    lower.includes("does not exist") ||
    lower.includes("could not find the table") ||
    lower.includes("schema cache")
  );
}

async function countRows(db, table, filter) {
  let q = db.from(table).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count, error } = await q;
  if (error) {
    if (isMissingTableError(error.message)) return null;
    throw new Error(`${table} count failed: ${error.message}`);
  }
  return count ?? 0;
}

async function detectInventoryTables(db) {
  const existing = [];

  for (const table of INVENTORY_DELETE_TABLE_CANDIDATES) {
    const count = await countRows(db, table);
    if (count !== null) {
      existing.push({ table, rows: count });
    }
  }

  return existing;
}

async function deleteAllRows(db, table) {
  const before = await countRows(db, table);
  if (before === null) return { skipped: true, removed: 0 };
  if (before === 0) return { skipped: false, removed: 0 };

  if (DRY_RUN) {
    return { skipped: false, removed: before, dryRun: true };
  }

  const { error } = await db.from(table).delete().gte("created_at", "1970-01-01T00:00:00.000Z");
  if (error) {
    const fallback = await db.from(table).delete().neq("id", NIL_UUID);
    if (fallback.error) {
      throw new Error(`${table} delete failed: ${error.message}; fallback: ${fallback.error.message}`);
    }
  }

  const after = await countRows(db, table);
  return { skipped: false, removed: before - (after ?? 0) };
}

async function countVariantsWithStock(db) {
  const { count, error } = await db
    .from("product_variants")
    .select("*", { count: "exact", head: true })
    .gt("stock_quantity", 0);

  if (error) throw new Error(`product_variants stock count failed: ${error.message}`);
  return count ?? 0;
}

async function countProductsWithStock(db) {
  const { count, error } = await db
    .from("products")
    .select("*", { count: "exact", head: true })
    .gt("stock_quantity", 0);

  if (error) throw new Error(`products stock count failed: ${error.message}`);
  return count ?? 0;
}

async function zeroVariantStock(db) {
  const before = await countVariantsWithStock(db);
  if (before === 0) return { updated: 0, dryRun: DRY_RUN };

  if (DRY_RUN) {
    return { updated: before, dryRun: true };
  }

  const { error } = await db
    .from("product_variants")
    .update({ stock_quantity: 0 })
    .gt("stock_quantity", 0);

  if (error) throw new Error(`product_variants stock reset failed: ${error.message}`);

  const after = await countVariantsWithStock(db);
  return { updated: before - after, dryRun: false };
}

async function zeroProductStockTotals(db) {
  const before = await countProductsWithStock(db);
  if (before === 0) return { updated: 0, dryRun: DRY_RUN };

  if (DRY_RUN) {
    return { updated: before, dryRun: true };
  }

  const { error } = await db
    .from("products")
    .update({ stock_quantity: 0, updated_at: new Date().toISOString() })
    .gt("stock_quantity", 0);

  if (error) throw new Error(`products stock reset failed: ${error.message}`);

  const after = await countProductsWithStock(db);
  return { updated: before - after, dryRun: false };
}

async function snapshotPreservedCounts(db) {
  const snapshot = {};
  for (const table of PRESERVED_TABLES) {
    snapshot[table] = await countRows(db, table);
    if (snapshot[table] === null) {
      snapshot[table] = 0;
    }
  }
  return snapshot;
}

async function main() {
  const { url, serviceKey } = mergeEnv();
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const db = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  console.log(DRY_RUN ? "=== DRY RUN (no writes) ===" : "=== INVENTORY RESET ===");

  console.log("\n=== DETECTING INVENTORY TABLES ===");
  const detected = await detectInventoryTables(db);

  if (detected.length === 0) {
    console.log("No dedicated inventory audit/history tables found in this database.");
    console.log(
      "Stock is stored on product_variants.stock_quantity and products.stock_quantity."
    );
  } else {
    console.log("Dedicated inventory tables found:");
    for (const row of detected) {
      console.log(`  - ${row.table}: ${row.rows} row(s)`);
    }
  }

  const preservedBefore = await snapshotPreservedCounts(db);
  console.log("\n=== PRESERVED TABLE ROW COUNTS (before) ===");
  console.log(preservedBefore);

  const variantStockBefore = await countVariantsWithStock(db);
  const productStockBefore = await countProductsWithStock(db);
  console.log("\n=== STOCK LEVELS (before) ===");
  console.log({
    product_variants_with_stock_gt_0: variantStockBefore,
    products_with_stock_gt_0: productStockBefore
  });

  console.log("\n=== RESET ACTIONS ===");
  const results = {};

  for (const { table, rows } of detected) {
    if (rows === 0) {
      results[table] = { removed: 0, note: "already empty" };
      continue;
    }
    const outcome = await deleteAllRows(db, table);
    results[table] = outcome.dryRun
      ? { would_remove: outcome.removed }
      : { removed: outcome.removed };
  }

  const variantReset = await zeroVariantStock(db);
  results["product_variants.stock_quantity → 0"] = variantReset.dryRun
    ? { would_update: variantReset.updated }
    : { updated: variantReset.updated };

  const productReset = await zeroProductStockTotals(db);
  results["products.stock_quantity → 0"] = productReset.dryRun
    ? { would_update: productReset.updated }
    : { updated: productReset.updated };

  console.log(results);

  console.log("\n=== STOCK LEVELS (after) ===");
  if (DRY_RUN) {
    console.log("(unchanged in dry run)");
  } else {
    console.log({
      product_variants_with_stock_gt_0: await countVariantsWithStock(db),
      products_with_stock_gt_0: await countProductsWithStock(db)
    });
  }

  const preservedAfter = await snapshotPreservedCounts(db);
  console.log("\n=== PRESERVED TABLE ROW COUNTS (after) ===");
  console.log(preservedAfter);

  let preservedOk = true;
  for (const table of PRESERVED_TABLES) {
    if (preservedBefore[table] !== preservedAfter[table]) {
      preservedOk = false;
      console.error(
        `  MISMATCH: ${table} before=${preservedBefore[table]} after=${preservedAfter[table]}`
      );
    }
  }

  if (!preservedOk) {
    console.error("\nPreserved table row counts changed — aborting verification.");
    process.exit(1);
  }

  console.log("\n=== SUMMARY ===");
  if (detected.length === 0) {
    console.log("Dedicated inventory tables: none (skipped).");
  } else {
    for (const { table } of detected) {
      const r = results[table];
      if (r?.would_remove != null) {
        console.log(`  ${table}: would remove ${r.would_remove} row(s)`);
      } else {
        console.log(`  ${table}: removed ${r?.removed ?? 0} row(s)`);
      }
    }
  }

  const vv = results["product_variants.stock_quantity → 0"];
  const pp = results["products.stock_quantity → 0"];
  if (vv?.would_update != null) {
    console.log(`  product_variants: would zero ${vv.would_update} variant row(s)`);
    console.log(`  products: would zero ${pp.would_update} product total(s)`);
  } else {
    console.log(`  product_variants: zeroed ${vv?.updated ?? 0} variant row(s)`);
    console.log(`  products: zeroed ${pp?.updated ?? 0} product total(s)`);
  }

  console.log("\nVerified unchanged row counts:");
  for (const table of PRESERVED_TABLES) {
    console.log(`  - ${table}: ${preservedAfter[table]} row(s)`);
  }

  console.log(
    "\nNote: Admin inventory report cache is in-memory only — restart the dev server to clear it."
  );

  if (DRY_RUN) {
    console.log("\nRe-run without DRY_RUN=true to apply changes.");
  } else {
    console.log("\nInventory reset complete. Products remain listed with zero stock.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
