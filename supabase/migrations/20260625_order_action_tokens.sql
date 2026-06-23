-- Secure tokenized order actions (approve / remind) + audit log

CREATE TABLE IF NOT EXISTS action_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  action_type text NOT NULL CHECK (action_type IN ('approve', 'remind')),
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_tokens_token ON action_tokens (token);
CREATE INDEX IF NOT EXISTS idx_action_tokens_order_id ON action_tokens (order_id);
CREATE INDEX IF NOT EXISTS idx_action_tokens_valid
  ON action_tokens (order_id, action_type)
  WHERE used = false;

CREATE TABLE IF NOT EXISTS order_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('approved', 'remind_later')),
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_order_action_logs_order_id ON order_action_logs (order_id, performed_at DESC);

ALTER TABLE action_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_action_logs ENABLE ROW LEVEL SECURITY;
