-- Order Management V3: fulfillment pipeline statuses support + tracking_number alias

ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number text;

UPDATE orders SET tracking_number = tracking_id WHERE tracking_number IS NULL AND tracking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_payment_status_idx ON orders(payment_status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at DESC);

NOTIFY pgrst, 'reload schema';
