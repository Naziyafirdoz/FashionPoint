-- Fulfillment zone (local/outstation), method (rapido/dtdc/delivery_boy),
-- and separate delivery-worker assignment (not packing assigned_worker_id).

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS fulfillment_zone text
    CHECK (fulfillment_zone IS NULL OR fulfillment_zone IN ('local', 'outstation'));

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS fulfillment_method text
    CHECK (
      fulfillment_method IS NULL
      OR fulfillment_method IN ('rapido', 'dtdc', 'delivery_boy')
    );

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS assigned_delivery_worker_id uuid;

CREATE INDEX IF NOT EXISTS idx_orders_assigned_delivery_worker_id
  ON orders (assigned_delivery_worker_id)
  WHERE assigned_delivery_worker_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_zone
  ON orders (fulfillment_zone)
  WHERE fulfillment_zone IS NOT NULL;

COMMENT ON COLUMN orders.fulfillment_zone IS
  'Persisted at order create from authoritative branch/PIN resolver: local | outstation';

COMMENT ON COLUMN orders.fulfillment_method IS
  'Selected at Ready for Shipping: rapido | dtdc | delivery_boy';

COMMENT ON COLUMN orders.assigned_delivery_worker_id IS
  'Delivery worker (admin_users.user_id with role delivery_worker). Separate from packing assigned_worker_id.';
