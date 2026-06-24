-- Extend audit log actions + enforce single successful approval log per order

ALTER TABLE order_action_logs
  DROP CONSTRAINT IF EXISTS order_action_logs_action_check;

ALTER TABLE order_action_logs
  ADD CONSTRAINT order_action_logs_action_check
  CHECK (
    action IN (
      'approved',
      'remind_later',
      'already_approved',
      'token_used',
      'token_expired',
      'invalid_token'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_action_logs_one_approved
  ON order_action_logs (order_id)
  WHERE action = 'approved';
