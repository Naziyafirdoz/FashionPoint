-- Admin approval audit fields on orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_orders_approved_by ON orders (approved_by)
  WHERE approved_by IS NOT NULL;
