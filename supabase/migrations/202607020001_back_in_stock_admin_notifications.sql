-- Back-in-stock admin notifications + list performance indexes

ALTER TABLE notifications
  ALTER COLUMN order_id DROP NOT NULL;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    'new_order',
    'packing_assigned',
    'packed',
    'ready_for_shipping',
    'shipped',
    'reminder',
    'back_in_stock'
  )
);

CREATE INDEX IF NOT EXISTS idx_out_of_stock_requests_status_created
  ON out_of_stock_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_out_of_stock_requests_product_status
  ON out_of_stock_requests (product_id, status);

CREATE INDEX IF NOT EXISTS idx_notifications_back_in_stock
  ON notifications (recipient, type, created_at DESC)
  WHERE type = 'back_in_stock';
