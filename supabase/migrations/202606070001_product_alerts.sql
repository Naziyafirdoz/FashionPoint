-- Blouse color availability alerts from Saree Color Matcher
CREATE TABLE IF NOT EXISTS product_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  phone text,
  color text NOT NULL,
  notification_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_alerts_color_idx ON product_alerts(color);
CREATE INDEX IF NOT EXISTS product_alerts_created_at_idx ON product_alerts(created_at DESC);

ALTER TABLE product_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert product alerts" ON product_alerts;

CREATE POLICY "Anyone can insert product alerts"
  ON product_alerts FOR INSERT
  WITH CHECK (true);
