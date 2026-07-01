-- Email-based back-in-stock notifications (idempotent, schema-agnostic)
-- Safe on fresh databases and legacy production schemas.

-- ---------------------------------------------------------------------------
-- 1. Ensure base table exists (fresh database)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS out_of_stock_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  product_name text,
  customer_name text,
  customer_email text,
  user_id uuid REFERENCES auth.users(id),
  status text DEFAULT 'pending',
  notified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. Add target columns only when missing
-- ---------------------------------------------------------------------------
ALTER TABLE out_of_stock_requests
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id),
  ADD COLUMN IF NOT EXISTS product_name text,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- ---------------------------------------------------------------------------
-- 3. Migrate legacy data only when legacy columns are present
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  has_name boolean;
  has_email boolean;
  has_phone boolean;
  has_status boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'out_of_stock_requests'
      AND column_name = 'name'
  ) INTO has_name;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'out_of_stock_requests'
      AND column_name = 'email'
  ) INTO has_email;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'out_of_stock_requests'
      AND column_name = 'phone'
  ) INTO has_phone;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'out_of_stock_requests'
      AND column_name = 'status'
  ) INTO has_status;

  IF has_name THEN
    EXECUTE $sql$
      UPDATE out_of_stock_requests
      SET customer_name = COALESCE(NULLIF(TRIM(customer_name), ''), NULLIF(TRIM(name), ''))
      WHERE customer_name IS NULL OR TRIM(customer_name) = ''
    $sql$;
  END IF;

  IF has_email THEN
    EXECUTE $sql$
      UPDATE out_of_stock_requests
      SET customer_email = COALESCE(
        NULLIF(TRIM(customer_email), ''),
        NULLIF(LOWER(TRIM(email)), '')
      )
      WHERE customer_email IS NULL OR TRIM(customer_email) = ''
    $sql$;
  END IF;

  IF has_status THEN
    EXECUTE $sql$
      UPDATE out_of_stock_requests
      SET status = COALESCE(NULLIF(TRIM(status), ''), 'pending')
      WHERE status IS NULL OR TRIM(status) = ''
    $sql$;
  END IF;

  -- Preserve rows that only had a phone number (no email column / value)
  IF has_phone AND NOT has_email THEN
    EXECUTE $sql$
      UPDATE out_of_stock_requests
      SET customer_email = COALESCE(
        NULLIF(TRIM(customer_email), ''),
        'legacy-' || id::text || '@fashionpoint.local'
      )
      WHERE customer_email IS NULL OR TRIM(customer_email) = ''
    $sql$;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Backfill remaining nulls so no records are lost
-- ---------------------------------------------------------------------------
UPDATE out_of_stock_requests
SET customer_name = COALESCE(NULLIF(TRIM(customer_name), ''), 'Valued Customer')
WHERE customer_name IS NULL OR TRIM(customer_name) = '';

UPDATE out_of_stock_requests
SET customer_email = COALESCE(
  NULLIF(TRIM(customer_email), ''),
  'legacy-' || id::text || '@fashionpoint.local'
)
WHERE customer_email IS NULL OR TRIM(customer_email) = '';

UPDATE out_of_stock_requests
SET status = COALESCE(NULLIF(TRIM(status), ''), 'pending')
WHERE status IS NULL OR TRIM(status) = '';

-- ---------------------------------------------------------------------------
-- 5. Drop legacy columns only when they exist
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  legacy_col text;
  legacy_cols text[] := ARRAY['name', 'phone', 'email', 'bust', 'waist', 'shoulder', 'message'];
BEGIN
  FOREACH legacy_col IN ARRAY legacy_cols
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'out_of_stock_requests'
        AND column_name = legacy_col
    ) THEN
      EXECUTE format('ALTER TABLE out_of_stock_requests DROP COLUMN %I', legacy_col);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Enforce final column constraints (idempotent)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'out_of_stock_requests'
      AND column_name = 'customer_name'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE out_of_stock_requests
      ALTER COLUMN customer_name SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'out_of_stock_requests'
      AND column_name = 'customer_email'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE out_of_stock_requests
      ALTER COLUMN customer_email SET NOT NULL;
  END IF;
END $$;

ALTER TABLE out_of_stock_requests
  ALTER COLUMN status SET DEFAULT 'pending';

-- ---------------------------------------------------------------------------
-- 7. Unique pending notification index
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_out_of_stock_requests_pending_email_product
  ON out_of_stock_requests (product_id, customer_email)
  WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- 8. RLS — enable without dropping existing policies
-- ---------------------------------------------------------------------------
ALTER TABLE out_of_stock_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'out_of_stock_requests'
      AND policyname = 'Anyone can insert stock notifications'
  ) THEN
    CREATE POLICY "Anyone can insert stock notifications"
      ON out_of_stock_requests
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

GRANT INSERT ON out_of_stock_requests TO anon, authenticated;
