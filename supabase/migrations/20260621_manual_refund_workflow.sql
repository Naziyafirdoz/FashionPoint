-- Manual prepaid cancellation refund workflow fields.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_method text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_upi_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_bank_holder_name text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_bank_account_number text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_bank_ifsc text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_bank_name text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_qr_image_url text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_by uuid;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_requested_at timestamptz;
