-- Dedicated Razorpay refund identifier. Do not reuse refund_reference (manual UTR).
-- Historical refund destination columns are intentionally left unchanged.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_refund_id text;

NOTIFY pgrst, 'reload schema';
