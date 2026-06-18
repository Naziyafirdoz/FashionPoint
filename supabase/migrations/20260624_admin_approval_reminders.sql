-- Admin approval reminder support (additive)

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    'new_order',
    'packing_assigned',
    'packed',
    'ready_for_shipping',
    'shipped',
    'reminder'
  )
);

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS remind_after timestamptz;

CREATE INDEX IF NOT EXISTS idx_notifications_remind_after
  ON notifications (remind_after)
  WHERE remind_after IS NOT NULL AND status = 'active';
