-- Fix product_alerts if an older schema was applied (recommended_color / notify_* columns)
DROP TABLE IF EXISTS product_alerts;

CREATE TABLE product_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  phone text,
  color text NOT NULL,
  notification_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_alerts_color_idx ON product_alerts(color);
CREATE INDEX product_alerts_created_at_idx ON product_alerts(created_at DESC);

ALTER TABLE product_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert product alerts"
  ON product_alerts FOR INSERT
  WITH CHECK (true);
