/**
 * Read-only: verify refund columns on the connected Supabase project.
 * Usage: node scripts/verify-refund-migration.mjs
 */
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  const vars = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) vars[m[1].trim()] = m[2].trim();
  }
  return vars;
}

const vars = loadEnv();
const url = vars.NEXT_PUBLIC_SUPABASE_URL;
const key = vars.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log(JSON.stringify({ ok: false, reason: "Missing Supabase credentials in .env.local" }, null, 2));
  process.exit(1);
}

const coreColumns =
  "refund_amount,refund_date,refund_reference,refund_notes,refund_initiated_at";

async function probe(select) {
  const probeUri = `${url}/rest/v1/orders?select=${select}&limit=0`;
  const res = await fetch(probeUri, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

const core = await probe(coreColumns);
const optional = await probe("expected_refund_date");

const schemaError = (body) =>
  String(body).toLowerCase().includes("refund_amount") ||
  String(body).toLowerCase().includes("schema cache") ||
  String(body).includes("PGRST204");

console.log(
  JSON.stringify(
    {
      core_migration_applied: core.ok,
      optional_expected_refund_date: optional.ok,
      refund_tracking_enabled: core.ok,
      http_status_core: core.status,
      refund_columns_required: [
        "refund_amount",
        "refund_date",
        "refund_reference",
        "refund_notes",
        "refund_initiated_at"
      ],
      probe: core.ok
        ? optional.ok
          ? "Core + optional refund columns accessible via PostgREST"
          : "Core refund columns OK; expected_refund_date optional column not present (UI uses computed fallback)"
        : schemaError(core.body)
          ? "Core columns missing or schema cache stale — run NOTIFY pgrst, 'reload schema';"
          : "Unexpected API response — check credentials or project URL",
      response_preview_core: core.body.slice(0, 200)
    },
    null,
    2
  )
);

process.exit(core.ok ? 0 : 1);
