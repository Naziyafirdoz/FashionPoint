-- Order Management V2: delivery, shipping, refund due dates, OTP

ALTER TABLE orders ADD COLUMN IF NOT EXISTS expected_refund_date timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_confirmed_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS otp_verified_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_date timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_otp text;

-- courier_partner aliases existing courier_name usage; add if missing
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_partner text;

UPDATE orders SET courier_partner = courier_name WHERE courier_partner IS NULL AND courier_name IS NOT NULL;

NOTIFY pgrst, 'reload schema';
