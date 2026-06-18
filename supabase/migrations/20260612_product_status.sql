-- Product lifecycle status (draft, active, out_of_stock, archived)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';

-- Backfill from legacy is_active + stock signals
UPDATE products p
SET status = CASE
  WHEN p.is_active = false THEN 'draft'
  WHEN COALESCE(p.stock_quantity, 0) <= 0 THEN 'out_of_stock'
  ELSE 'active'
END
;

CREATE INDEX IF NOT EXISTS products_status_idx ON products (status);
