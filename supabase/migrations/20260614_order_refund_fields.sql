-- Refund tracking fields on orders (prepaid cancellations)
-- Idempotent — safe to run multiple times.
-- After applying, refresh PostgREST schema cache (see docs/REFUND_MIGRATION.md).

ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_amount numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_date timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_reference text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_notes text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_initiated_at timestamptz;

NOTIFY pgrst, 'reload schema';
