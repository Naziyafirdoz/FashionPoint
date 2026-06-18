-- Customer return requests (one per order)

CREATE TABLE IF NOT EXISTS return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  notes text,
  image_url text,
  status text NOT NULL DEFAULT 'return_requested',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT return_requests_order_id_unique UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS return_requests_user_id_idx ON return_requests(user_id);
CREATE INDEX IF NOT EXISTS return_requests_order_id_idx ON return_requests(order_id);
CREATE INDEX IF NOT EXISTS return_requests_status_idx ON return_requests(status);

ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY return_requests_select_own ON return_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY return_requests_insert_own ON return_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
