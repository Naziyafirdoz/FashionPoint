/**
 * Export order-related rows via Supabase CLI (avoids REST statement timeouts).
 * Usage: node scripts/export-order-backup.mjs [outputDir]
 */
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";

const outDir =
  process.argv[2] ??
  resolve(process.cwd(), "supabase/backups/20260630-order-cleanup");
mkdirSync(outDir, { recursive: true });

const exports = [
  { table: "orders", file: "orders.json", where: null },
  {
    table: "reviews",
    file: "reviews-order-linked.json",
    where: "order_id IS NOT NULL",
  },
  { table: "return_requests", file: "return_requests.json", where: null },
  { table: "action_tokens", file: "action_tokens.json", where: null },
  { table: "order_action_logs", file: "order_action_logs.json", where: null },
  { table: "order_reminders", file: "order_reminders.json", where: null },
  {
    table: "order_notification_log",
    file: "order_notification_log.json",
    where: null,
  },
  { table: "notifications", file: "notifications.json", where: null },
  {
    table: "notification_logs",
    file: "notification_logs-order-linked.json",
    where: "order_id IS NOT NULL AND btrim(order_id) <> ''",
  },
];

function runQuery(sql) {
  const cmd = `npx supabase db query --linked -o json ${JSON.stringify(sql)}`;
  const raw = execSync(cmd, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const parsed = JSON.parse(raw);
  return parsed.rows ?? parsed;
}

const manifest = {
  exported_at: new Date().toISOString(),
  method: "supabase db query (linked)",
  tables: {},
};

for (const { table, file, where } of exports) {
  const whereClause = where ? ` WHERE ${where}` : "";
  const sql = `SELECT coalesce(json_agg(row_to_json(t)), '[]'::json) AS data FROM ${table} t${whereClause}`;
  const result = runQuery(sql);
  const rows = result[0]?.data ?? [];
  writeFileSync(resolve(outDir, file), JSON.stringify(rows, null, 2));
  manifest.tables[table] = { file, row_count: Array.isArray(rows) ? rows.length : 0 };
  console.log(`${table}: ${manifest.tables[table].row_count} rows -> ${file}`);
}

writeFileSync(resolve(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`\nBackup complete: ${outDir}`);
