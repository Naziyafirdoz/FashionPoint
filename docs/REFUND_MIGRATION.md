# Refund Database Migration

Fashion Point stores refund tracking on the `orders` table. Apply this migration before using **Mark as Refunded** or refund timeline features.

## Migration file

`supabase/migrations/20260614_order_refund_fields.sql`

## SQL

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_amount numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_date timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_reference text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_notes text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_initiated_at timestamptz;

NOTIFY pgrst, 'reload schema';
```

## Execution steps

### Option A — Supabase Dashboard (SQL Editor)

1. Open your Supabase project → **SQL Editor**.
2. Paste the SQL above (or open the migration file).
3. Click **Run**.
4. Wait a few seconds for PostgREST to reload its schema cache.

### Option B — Supabase CLI

```bash
supabase db push
```

Or run a single migration file against your linked project.

## Schema cache refresh

If the app still reports missing columns after migration:

1. In Supabase Dashboard → **Settings** → **API**, use **Reload schema** if available.
2. Or run in SQL Editor:

```sql
NOTIFY pgrst, 'reload schema';
```

3. Restart your Next.js dev server so API routes pick up a fresh schema check.

## Verification query

Run in SQL Editor:

```sql
SELECT
  refund_amount,
  refund_date,
  refund_reference,
  refund_notes,
  refund_initiated_at
FROM orders
LIMIT 1;
```

Expected: query succeeds (columns exist; values may be `NULL`).

## Optional column

`expected_refund_date` is added by `supabase/migrations/20260616_order_management_v2.sql`. Refund tracking works without it; the app computes expected dates from `refund_initiated_at` when the column is absent.

## Application behavior without migration

- Order list and order details remain usable.
- Refund Information, Mark as Refunded, and refund timeline entries are hidden.
- A notice is shown: **Refund tracking unavailable. Database migration required.**
- `POST /api/orders/[id]/refund` returns:

```json
{
  "success": false,
  "message": "Refund database migration not applied."
}
```

- Cancelling prepaid orders still sets `payment_status` to `refund_pending` without writing refund columns (no crash).
