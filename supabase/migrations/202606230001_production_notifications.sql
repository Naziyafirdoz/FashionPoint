-- Production notification system (additive)

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (
    type IN (
      'new_order',
      'packing_assigned',
      'packed',
      'ready_for_shipping',
      'shipped'
    )
  ),
  recipient text NOT NULL DEFAULT 'admin',
  title text NOT NULL,
  message text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON notifications (recipient, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON notifications (order_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup
  ON notifications (order_id, type, recipient);

CREATE TABLE IF NOT EXISTS notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'whatsapp', 'push')),
  event text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_created
  ON notification_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_logs_channel
  ON notification_logs (channel, event, created_at DESC);

ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS fcm_token text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_fcm_token
  ON push_subscriptions (fcm_token)
  WHERE fcm_token IS NOT NULL;
