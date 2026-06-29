-- Admin-configurable email notification recipients and preferences.

CREATE TABLE IF NOT EXISTS notification_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  notify_new_order boolean NOT NULL DEFAULT false,
  notify_low_stock boolean NOT NULL DEFAULT false,
  notify_cancel_request boolean NOT NULL DEFAULT false,
  notify_refund_request boolean NOT NULL DEFAULT false,
  notify_payment_failed boolean NOT NULL DEFAULT false,
  notify_new_review boolean NOT NULL DEFAULT false,
  notify_contact_form boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS notification_recipients_email_lower_idx
  ON notification_recipients (lower(trim(email)));

CREATE INDEX IF NOT EXISTS notification_recipients_enabled_idx
  ON notification_recipients (enabled);

INSERT INTO store_settings (key, value)
VALUES (
  'notification_email',
  jsonb_build_object('enabled', true)
)
ON CONFLICT (key) DO NOTHING;
