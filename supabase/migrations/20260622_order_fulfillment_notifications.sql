-- Order fulfillment workflow extensions (additive only)

ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_worker_id uuid REFERENCES auth.users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

CREATE TABLE IF NOT EXISTS order_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  audience text NOT NULL CHECK (audience IN ('admin', 'worker')),
  worker_id uuid REFERENCES auth.users(id),
  remind_at timestamptz NOT NULL,
  interval_hours integer NOT NULL DEFAULT 2,
  cancelled_at timestamptz,
  fulfilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_reminders_due
  ON order_reminders (remind_at)
  WHERE cancelled_at IS NULL AND fulfilled_at IS NULL;

CREATE TABLE IF NOT EXISTS order_notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  channel text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, event_type, channel)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_orders_assigned_worker ON orders (assigned_worker_id)
  WHERE assigned_worker_id IS NOT NULL;
