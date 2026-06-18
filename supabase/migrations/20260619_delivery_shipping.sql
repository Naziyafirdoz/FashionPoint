-- Delivery tracking and shipping zone fields for provider-based fulfillment.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipment_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_partner text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_zone text;

CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders (delivery_status)
  WHERE delivery_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_shipment_id ON orders (shipment_id)
  WHERE shipment_id IS NOT NULL;

-- Admin-configurable store settings (shipping rates, pickup address, provider keys).
CREATE TABLE IF NOT EXISTS store_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO store_settings (key, value)
VALUES (
  'shipping',
  jsonb_build_object(
    'localShippingCharge', 99,
    'outstationShippingCharge', 200,
    'defaultPackageWeightKg', 0.5,
    'deliveryProvider', 'mock'
  )
)
ON CONFLICT (key) DO NOTHING;
