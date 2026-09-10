-- Customer order email templates (Settings → Email Templates).
-- One active row per event_key; workflow loads the active template at send time.

CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_templates_event_key_unique UNIQUE (event_key)
);

CREATE INDEX IF NOT EXISTS idx_email_templates_active
  ON public.email_templates (event_key)
  WHERE is_active = true;

COMMENT ON TABLE public.email_templates IS
  'Editable customer email templates for order lifecycle events.';

COMMENT ON COLUMN public.email_templates.event_key IS
  'Stable key: order_confirmation, ready_for_shipping, out_for_delivery, order_delivered, order_cancelled.';

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Service role / server only (no public policies). Admins use service client via API.
REVOKE ALL ON TABLE public.email_templates FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.email_templates TO service_role;
GRANT SELECT ON TABLE public.email_templates TO authenticated;

-- Seed defaults (ON CONFLICT DO NOTHING so admin edits survive re-apply).
-- Bodies use {{variable}} placeholders; full branded defaults may also be
-- ensured from application code on first Settings load.

INSERT INTO public.email_templates (event_key, name, subject, body_html, is_active)
VALUES
(
  'order_confirmation',
  'Order Confirmation',
  'Order Confirmed — {{order_number}}',
  $html$<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Order Confirmed</title></head><body style="margin:0;background:#F3EFEB;font-family:Georgia,'Times New Roman',serif;color:#1A1A1A;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px;"><table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 28px rgba(123,13,43,0.08);"><tr><td style="background:#7B0D2B;padding:22px 20px;text-align:center;"><p style="margin:0;font-size:20px;font-weight:700;letter-spacing:0.04em;color:#ffffff;font-family:system-ui,-apple-system,sans-serif;">{{store_name}}</p><p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.85);font-family:system-ui,-apple-system,sans-serif;">Order Confirmation</p></td></tr><tr><td style="padding:28px 24px;font-family:system-ui,-apple-system,sans-serif;"><p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hello {{customer_name}},</p><p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:#1A1A1A;">Your order has been confirmed and our team is preparing your parcel.</p><p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#5C5C5C;">We&apos;ll notify you when it is ready for shipping.</p><table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#FAF8F6;border:1px solid #E8E0DA;border-radius:12px;"><tr><td style="padding:16px 18px;"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#B8860B;">Order summary</p><p style="margin:0 0 6px;font-size:14px;"><strong>Order</strong> {{order_number}}</p><p style="margin:0 0 6px;font-size:14px;"><strong>Date</strong> {{order_date}}</p><p style="margin:0 0 6px;font-size:14px;"><strong>Amount</strong> {{amount}}</p><p style="margin:0;font-size:14px;"><strong>Payment</strong> {{payment_method}} · {{payment_status}}</p></td></tr></table><div style="margin:0 0 20px;">{{items_html}}</div><table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;background:#FAF8F6;border:1px solid #E8E0DA;border-radius:12px;"><tr><td style="padding:16px 18px;"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#B8860B;">Delivery address</p><p style="margin:0;font-size:14px;line-height:1.6;">{{delivery_address_html}}</p></td></tr></table><p style="margin:24px 0 0;font-size:14px;line-height:1.6;"><a href="{{my_orders_url}}" style="color:#7B0D2B;font-weight:600;">View your order</a></p></td></tr><tr><td style="padding:20px 24px;text-align:center;border-top:1px solid #E8E0DA;font-family:system-ui,-apple-system,sans-serif;"><p style="margin:0 0 4px;font-size:13px;color:#7B0D2B;font-weight:600;">Thank you for shopping with {{store_name}}</p><p style="margin:0;font-size:12px;color:#5C5C5C;">Fashion you love, delivered with care.</p></td></tr></table></td></tr></table></body></html>$html$,
  true
),
(
  'ready_for_shipping',
  'Ready for Shipping',
  'Ready for Shipping — {{order_number}}',
  $html$<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Ready for Shipping</title></head><body style="margin:0;background:#F3EFEB;font-family:system-ui,-apple-system,sans-serif;color:#1A1A1A;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px;"><table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;"><tr><td style="background:#7B0D2B;padding:22px 20px;text-align:center;color:#fff;"><p style="margin:0;font-size:20px;font-weight:700;">{{store_name}}</p><p style="margin:6px 0 0;font-size:12px;opacity:0.9;">Ready for Shipping</p></td></tr><tr><td style="padding:28px 24px;"><p style="margin:0 0 16px;font-size:16px;">Hello {{customer_name}},</p><p style="margin:0 0 12px;font-size:15px;line-height:1.65;">Your parcel for order <strong>{{order_number}}</strong> is packed and ready for dispatch.</p><p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#5C5C5C;">We are arranging shipment and will notify you once it is out for delivery.</p><table width="100%" style="background:#FAF8F6;border:1px solid #E8E0DA;border-radius:12px;"><tr><td style="padding:16px;"><p style="margin:0 0 6px;font-size:14px;"><strong>Order</strong> {{order_number}}</p><p style="margin:0 0 6px;font-size:14px;"><strong>Date</strong> {{order_date}}</p><p style="margin:0;font-size:14px;"><strong>Amount</strong> {{amount}}</p></td></tr></table><p style="margin:24px 0 0;font-size:14px;"><a href="{{my_orders_url}}" style="color:#7B0D2B;font-weight:600;">Track your order</a></p></td></tr><tr><td style="padding:20px;text-align:center;border-top:1px solid #E8E0DA;"><p style="margin:0;font-size:12px;color:#5C5C5C;">{{store_name}}</p></td></tr></table></td></tr></table></body></html>$html$,
  true
),
(
  'out_for_delivery',
  'Out for Delivery',
  'Out for Delivery — {{order_number}}',
  $html$<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Out for Delivery</title></head><body style="margin:0;background:#F3EFEB;font-family:system-ui,-apple-system,sans-serif;color:#1A1A1A;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px;"><table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;"><tr><td style="background:#7B0D2B;padding:22px 20px;text-align:center;color:#fff;"><p style="margin:0;font-size:20px;font-weight:700;">{{store_name}}</p><p style="margin:6px 0 0;font-size:12px;opacity:0.9;">Out for Delivery</p></td></tr><tr><td style="padding:28px 24px;"><p style="margin:0 0 16px;font-size:16px;">Hello {{customer_name}},</p><p style="margin:0 0 12px;font-size:15px;line-height:1.65;">Great news — order <strong>{{order_number}}</strong> is out for delivery.</p><p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#5C5C5C;">Our delivery partner is on the way to your address.</p><table width="100%" style="background:#FAF8F6;border:1px solid #E8E0DA;border-radius:12px;margin-bottom:16px;"><tr><td style="padding:16px;"><p style="margin:0 0 6px;font-size:14px;"><strong>Delivery method</strong> {{delivery_method}}</p><p style="margin:0 0 6px;font-size:14px;"><strong>Delivery staff</strong> {{delivery_staff_name}}</p><p style="margin:0 0 6px;font-size:14px;"><strong>Tracking</strong> {{tracking_number}}</p><p style="margin:0;font-size:14px;"><strong>Amount</strong> {{amount}}</p></td></tr></table><table width="100%" style="background:#FAF8F6;border:1px solid #E8E0DA;border-radius:12px;"><tr><td style="padding:16px;"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#B8860B;">Delivering to</p><p style="margin:0;font-size:14px;line-height:1.6;">{{delivery_address_html}}</p></td></tr></table><p style="margin:24px 0 0;font-size:14px;"><a href="{{my_orders_url}}" style="color:#7B0D2B;font-weight:600;">View order status</a></p></td></tr><tr><td style="padding:20px;text-align:center;border-top:1px solid #E8E0DA;"><p style="margin:0;font-size:12px;color:#5C5C5C;">{{store_name}}</p></td></tr></table></td></tr></table></body></html>$html$,
  true
),
(
  'order_delivered',
  'Order Delivered',
  'Order Delivered — {{order_number}}',
  $html$<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Order Delivered</title></head><body style="margin:0;background:#F3EFEB;font-family:system-ui,-apple-system,sans-serif;color:#1A1A1A;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px;"><table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;"><tr><td style="background:#7B0D2B;padding:22px 20px;text-align:center;color:#fff;"><p style="margin:0;font-size:20px;font-weight:700;">{{store_name}}</p><p style="margin:6px 0 0;font-size:12px;opacity:0.9;">Delivered</p></td></tr><tr><td style="padding:28px 24px;"><p style="margin:0 0 16px;font-size:16px;">Hello {{customer_name}},</p><p style="margin:0 0 12px;font-size:15px;line-height:1.65;">Your order <strong>{{order_number}}</strong> has been successfully delivered.</p><p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#5C5C5C;">We hope you love your purchase. Thank you for choosing {{store_name}}.</p><table width="100%" style="background:#FAF8F6;border:1px solid #E8E0DA;border-radius:12px;margin-bottom:16px;"><tr><td style="padding:16px;"><p style="margin:0 0 6px;font-size:14px;"><strong>Order</strong> {{order_number}}</p><p style="margin:0 0 6px;font-size:14px;"><strong>Date</strong> {{order_date}}</p><p style="margin:0;font-size:14px;"><strong>Amount</strong> {{amount}}</p></td></tr></table><div style="margin:0 0 20px;">{{items_html}}</div><p style="margin:0;font-size:15px;line-height:1.65;">We&apos;d love your feedback — review your items from <a href="{{my_orders_url}}" style="color:#7B0D2B;font-weight:600;">My Orders</a>.</p></td></tr><tr><td style="padding:20px;text-align:center;border-top:1px solid #E8E0DA;"><p style="margin:0 0 4px;font-size:13px;color:#7B0D2B;font-weight:600;">Thank you for shopping with {{store_name}}</p><p style="margin:0;font-size:12px;color:#5C5C5C;">Fashion you love, delivered with care.</p></td></tr></table></td></tr></table></body></html>$html$,
  true
),
(
  'order_cancelled',
  'Order Cancelled',
  'Order Cancelled — {{order_number}}',
  $html$<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Order Cancelled</title></head><body style="margin:0;background:#F3EFEB;font-family:system-ui,-apple-system,sans-serif;color:#1A1A1A;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px;"><table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;"><tr><td style="background:#7B0D2B;padding:22px 20px;text-align:center;color:#fff;"><p style="margin:0;font-size:20px;font-weight:700;">{{store_name}}</p><p style="margin:6px 0 0;font-size:12px;opacity:0.9;">Order Cancelled</p></td></tr><tr><td style="padding:28px 24px;"><p style="margin:0 0 16px;font-size:16px;">Hello {{customer_name}},</p><p style="margin:0 0 12px;font-size:15px;line-height:1.65;">Your order <strong>{{order_number}}</strong> has been cancelled.</p><p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#5C5C5C;">If a payment was collected, any applicable refund will be processed according to our refund policy.</p><table width="100%" style="background:#FAF8F6;border:1px solid #E8E0DA;border-radius:12px;"><tr><td style="padding:16px;"><p style="margin:0 0 6px;font-size:14px;"><strong>Order</strong> {{order_number}}</p><p style="margin:0 0 6px;font-size:14px;"><strong>Date</strong> {{order_date}}</p><p style="margin:0;font-size:14px;"><strong>Amount</strong> {{amount}}</p></td></tr></table><p style="margin:24px 0 0;font-size:14px;"><a href="{{my_orders_url}}" style="color:#7B0D2B;font-weight:600;">View order details</a></p></td></tr><tr><td style="padding:20px;text-align:center;border-top:1px solid #E8E0DA;"><p style="margin:0;font-size:12px;color:#5C5C5C;">Need help? Reply to this email or contact {{store_name}}.</p></td></tr></table></td></tr></table></body></html>$html$,
  true
)
ON CONFLICT (event_key) DO NOTHING;
