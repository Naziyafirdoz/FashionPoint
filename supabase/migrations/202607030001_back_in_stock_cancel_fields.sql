-- Back-in-stock request cancellation metadata (backward compatible)

ALTER TABLE out_of_stock_requests
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_out_of_stock_requests_cancel_reason
  ON out_of_stock_requests (cancel_reason)
  WHERE cancel_reason IS NOT NULL;
