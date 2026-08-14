-- Multi-branch shipping: branches + PIN service areas.
-- Preserves existing store_settings (delivery provider, etc.) and historical orders.

CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  address text,
  city text NOT NULL,
  state text NOT NULL DEFAULT '',
  pincode text NOT NULL DEFAULT '',
  phone text,
  local_shipping_charge numeric NOT NULL DEFAULT 99 CHECK (local_shipping_charge >= 0),
  outstation_shipping_charge numeric NOT NULL DEFAULT 200 CHECK (outstation_shipping_charge >= 0),
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS branch_service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  pincode text NOT NULL,
  is_local boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, pincode)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_branch_service_areas_pincode_unique
  ON branch_service_areas (pincode);

CREATE INDEX IF NOT EXISTS idx_branch_service_areas_branch_id
  ON branch_service_areas (branch_id);

CREATE INDEX IF NOT EXISTS idx_branches_active
  ON branches (is_active, sort_order);

-- Only one default branch
CREATE UNIQUE INDEX IF NOT EXISTS idx_branches_single_default
  ON branches (is_default)
  WHERE is_default = true;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id);

CREATE INDEX IF NOT EXISTS idx_orders_branch_id ON orders (branch_id)
  WHERE branch_id IS NOT NULL;

-- Seed Vijayawada from existing store_settings + hardcoded local pincodes (520001–520016).
DO $$
DECLARE
  v_branch_id uuid;
  v_local numeric := 99;
  v_outstation numeric := 199;
  v_address text;
  v_city text := 'Vijayawada';
  v_pincode text := '520001';
  v_phone text;
  v_pin text;
BEGIN
  IF EXISTS (SELECT 1 FROM branches WHERE slug = 'vijayawada') THEN
    RETURN;
  END IF;

  SELECT
    COALESCE((value->>'localShippingCharge')::numeric, 99),
    COALESCE((value->>'outstationShippingCharge')::numeric, 199),
    COALESCE(value->>'storePickupAddress', ''),
    COALESCE(value->>'storePickupCity', 'Vijayawada'),
    COALESCE(value->>'storePickupPincode', '520001'),
    COALESCE(value->>'storePickupPhone', '')
  INTO v_local, v_outstation, v_address, v_city, v_pincode, v_phone
  FROM store_settings
  WHERE key = 'shipping';

  IF v_address IS NULL OR v_address = '' THEN
    v_address := '11-49-188, Opp. Lion School, Brahmin St, Mallikarjunapeta, Vijayawada, Andhra Pradesh 520001';
  END IF;

  INSERT INTO branches (
    name, slug, address, city, state, pincode, phone,
    local_shipping_charge, outstation_shipping_charge,
    is_active, is_default, sort_order
  ) VALUES (
    'Vijayawada', 'vijayawada', v_address, v_city, 'Andhra Pradesh', v_pincode, v_phone,
    v_local, v_outstation,
    true, true, 0
  )
  RETURNING id INTO v_branch_id;

  FOREACH v_pin IN ARRAY ARRAY[
    '520001','520002','520003','520004','520005','520006',
    '520007','520008','520009','520010','520011','520012',
    '520013','520014','520015','520016'
  ] LOOP
    INSERT INTO branch_service_areas (branch_id, pincode, is_local)
    VALUES (v_branch_id, v_pin, true)
    ON CONFLICT (pincode) DO NOTHING;
  END LOOP;

  -- Bangalore branch (inactive service areas until Admin configures PINs).
  INSERT INTO branches (
    name, slug, address, city, state, pincode, phone,
    local_shipping_charge, outstation_shipping_charge,
    is_active, is_default, sort_order
  ) VALUES (
    'Bangalore', 'bangalore', NULL, 'Bangalore', 'Karnataka', '560001', NULL,
    99, 200,
    true, false, 1
  );
END $$;
