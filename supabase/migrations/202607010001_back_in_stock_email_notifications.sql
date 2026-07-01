-- Email-based back-in-stock notifications (replaces WhatsApp / phone fields)

ALTER TABLE out_of_stock_requests
  ADD COLUMN IF NOT EXISTS product_name text,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS notified_at timestamptz;

-- Migrate legacy rows when present
UPDATE out_of_stock_requests
SET
  customer_name = COALESCE(customer_name, name),
  customer_email = COALESCE(
    customer_email,
    NULLIF(LOWER(TRIM(email)), ''),
    'legacy@fashionpoint.local'
  ),
  status = COALESCE(NULLIF(TRIM(status), ''), 'pending')
WHERE customer_name IS NULL OR customer_email IS NULL;

ALTER TABLE out_of_stock_requests
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS bust,
  DROP COLUMN IF EXISTS waist,
  DROP COLUMN IF EXISTS shoulder,
  DROP COLUMN IF EXISTS message,
  DROP COLUMN IF EXISTS email;

ALTER TABLE out_of_stock_requests
  ALTER COLUMN customer_name SET NOT NULL,
  ALTER COLUMN customer_email SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS idx_out_of_stock_requests_pending_email_product
  ON out_of_stock_requests (product_id, customer_email)
  WHERE status = 'pending';

ALTER TABLE out_of_stock_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert stock notifications" ON out_of_stock_requests;
CREATE POLICY "Anyone can insert stock notifications"
  ON out_of_stock_requests
  FOR INSERT
  WITH CHECK (true);

GRANT INSERT ON out_of_stock_requests TO anon, authenticated;
