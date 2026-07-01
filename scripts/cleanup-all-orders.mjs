/**
 * Delete all order-related data via Supabase service role (no schema changes).
 * Preserves reviews (unlinks order_id), inventory, products, users, back_in_stock notifications.
 *
 * Usage: node scripts/cleanup-all-orders.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const NIL_UUID = "00000000-0000-0000-0000-000000000000";

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

async function countRows(db, table, filter) {
  let q = db.from(table).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count, error } = await q;
  if (error) throw new Error(`${table} count failed: ${error.message}`);
  return count ?? 0;
}

async function deleteAll(db, table, dateColumn = "created_at") {
  const before = await countRows(db, table);
  if (before === 0) return 0;

  const { error } = await db.from(table).delete().gte(dateColumn, "1970-01-01T00:00:00.000Z");
  if (error) {
    const fallback = await db.from(table).delete().neq("id", NIL_UUID);
    if (fallback.error) {
      throw new Error(`${table} delete failed: ${error.message}; fallback: ${fallback.error.message}`);
    }
  }

  const after = await countRows(db, table);
  return before - after;
}

async function deleteOrderLinked(db, table) {
  const before = await countRows(db, table, (q) => q.not("order_id", "is", null));
  if (before === 0) return 0;

  const { error } = await db.from(table).delete().not("order_id", "is", null);
  if (error) throw new Error(`${table} delete failed: ${error.message}`);

  const after = await countRows(db, table, (q) => q.not("order_id", "is", null));
  return before - after;
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

  console.log("=== PRE-DELETE COUNTS ===");
  const pre = {
    orders: await countRows(db, "orders"),
    return_requests: await countRows(db, "return_requests"),
    reviews_linked: await countRows(db, "reviews", (q) => q.not("order_id", "is", null)),
    reviews_total: await countRows(db, "reviews"),
    notifications_order: await countRows(db, "notifications", (q) => q.not("order_id", "is", null)),
    notifications_back_in_stock: await countRows(db, "notifications", (q) =>
      q.is("order_id", null).eq("type", "back_in_stock")
    )
  };
  console.log(pre);

  if (pre.orders === 0) {
    console.log("\nNo orders to delete. Database is already clean.");
    return;
  }

  console.log("\n=== DELETING ORDER DATA ===");
  const results = {};

  const linkedReviews = await countRows(db, "reviews", (q) => q.not("order_id", "is", null));
  if (linkedReviews > 0) {
    const { error } = await db
      .from("reviews")
      .update({ order_id: null })
      .not("order_id", "is", null);
    if (error) throw new Error(`reviews unlink failed: ${error.message}`);
  }
  results["reviews (order_id unlinked)"] = linkedReviews;

  results["notification_logs (order-linked)"] = await deleteOrderLinked(db, "notification_logs");
  results["notifications (order-linked)"] = await deleteOrderLinked(db, "notifications");
  results.order_action_logs = await deleteAll(db, "order_action_logs", "performed_at");
  results.action_tokens = await deleteAll(db, "action_tokens");
  results.order_notification_log = await deleteAll(db, "order_notification_log", "sent_at");
  results.order_reminders = await deleteAll(db, "order_reminders");
  results.return_requests = await deleteAll(db, "return_requests");
  results.orders = await deleteAll(db, "orders");

  const { error: customerError } = await db
    .from("customers")
    .update({ total_orders: 0, total_spent: 0 })
    .or("total_orders.gt.0,total_spent.gt.0");
  if (customerError && !customerError.message.includes("column")) {
    console.warn("Customer stats reset skipped:", customerError.message);
  } else {
    results["customers (stats reset)"] = "ok";
  }

  console.log(results);

  console.log("\n=== POST-DELETE VERIFICATION ===");
  const post = {
    orders: await countRows(db, "orders"),
    return_requests: await countRows(db, "return_requests"),
    reviews_linked: await countRows(db, "reviews", (q) => q.not("order_id", "is", null)),
    reviews_total: await countRows(db, "reviews"),
    notifications_order: await countRows(db, "notifications", (q) => q.not("order_id", "is", null)),
    action_tokens: await countRows(db, "action_tokens"),
    order_action_logs: await countRows(db, "order_action_logs")
  };
  console.log(post);

  const orphans =
    post.orders +
    post.return_requests +
    post.reviews_linked +
    post.notifications_order +
    post.action_tokens +
    post.order_action_logs;

  if (orphans !== 0) {
    console.error("\nCleanup incomplete — orphan order-related rows remain.");
    process.exit(1);
  }

  console.log("\nCleanup complete.");
  console.log(
    "Tip: clear browser localStorage key `fashionpoint_admin_notifications` on admin devices to reset local notification cache."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
