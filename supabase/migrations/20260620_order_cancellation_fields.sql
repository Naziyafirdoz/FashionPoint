-- Customer order cancellation metadata (idempotent).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_status text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_completed_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason text;
