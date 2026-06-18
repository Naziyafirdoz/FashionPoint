-- Production cleanup: simplify statuses, delivery dates, internal notes

-- Migrate legacy statuses
UPDATE orders SET status = 'processing' WHERE status = 'cod_verification';
UPDATE orders SET status = 'out_for_delivery' WHERE status = 'shipped';

-- Delivery date tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS preferred_delivery_date date;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_date date;

-- Admin internal notes (separate from customer-facing notes)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS internal_notes text;

-- Optional fulfillment timestamps for richer timeline
ALTER TABLE orders ADD COLUMN IF NOT EXISTS packed_at timestamptz;

-- Tax line item for invoices (defaults to 0)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_estimated_delivery ON orders (estimated_delivery_date)
  WHERE estimated_delivery_date IS NOT NULL;
