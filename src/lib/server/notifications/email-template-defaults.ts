import {
  EMAIL_TEMPLATE_EVENTS,
  emailTemplateEventLabel,
  type EmailTemplateEventKey
} from "@/lib/settings/email-templates";

const MAROON = "#7B0D2B";
const GOLD = "#B8860B";
const CARD = "#FAF8F6";
const BORDER = "#E8E0DA";
const MUTED = "#5C5C5C";
const BG = "#F3EFEB";

function shell(badge: string, inner: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${badge}</title></head><body style="margin:0;background:${BG};font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1A1A1A;"><table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center" style="padding:28px 12px;"><table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 28px rgba(123,13,43,0.08);" role="presentation"><tr><td style="background:${MAROON};padding:22px 20px;text-align:center;"><p style="margin:0;font-size:20px;font-weight:700;letter-spacing:0.04em;color:#ffffff;">{{store_name}}</p><p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.88);">${badge}</p></td></tr><tr><td style="padding:28px 24px;">${inner}</td></tr><tr><td style="padding:20px 24px;text-align:center;border-top:1px solid ${BORDER};"><p style="margin:0 0 4px;font-size:13px;color:${MAROON};font-weight:600;">Thank you for shopping with {{store_name}}</p><p style="margin:0;font-size:12px;color:${MUTED};">Fashion you love, delivered with care.</p></td></tr></table></td></tr></table></body></html>`;
}

function summaryCard(extraRows = ""): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:${CARD};border:1px solid ${BORDER};border-radius:12px;"><tr><td style="padding:16px 18px;"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${GOLD};">Order summary</p><p style="margin:0 0 6px;font-size:14px;"><strong>Order</strong> {{order_number}}</p><p style="margin:0 0 6px;font-size:14px;"><strong>Date</strong> {{order_date}}</p><p style="margin:0 0 6px;font-size:14px;"><strong>Amount</strong> {{amount}}</p>${extraRows}</td></tr></table>`;
}

export type DefaultEmailTemplate = {
  event_key: EmailTemplateEventKey;
  name: string;
  subject: string;
  body_html: string;
};

export const DEFAULT_EMAIL_TEMPLATES: DefaultEmailTemplate[] = [
  {
    event_key: "order_confirmation",
    name: emailTemplateEventLabel("order_confirmation"),
    subject: "Order Confirmed — {{order_number}}",
    body_html: shell(
      "Order Confirmation",
      `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hello {{customer_name}},</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.65;">Your order has been confirmed and our team is preparing your parcel.</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:${MUTED};">We'll notify you when it is ready for shipping.</p>
      ${summaryCard(`<p style="margin:0;font-size:14px;"><strong>Payment</strong> {{payment_method}} · {{payment_status}}</p>`)}
      <div style="margin:0 0 20px;">{{items_html}}</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;background:${CARD};border:1px solid ${BORDER};border-radius:12px;"><tr><td style="padding:16px 18px;"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${GOLD};">Delivery address</p><p style="margin:0;font-size:14px;line-height:1.6;">{{delivery_address_html}}</p></td></tr></table>
      <p style="margin:24px 0 0;font-size:14px;line-height:1.6;"><a href="{{my_orders_url}}" style="color:${MAROON};font-weight:600;">View your order</a></p>`
    )
  },
  {
    event_key: "ready_for_shipping",
    name: emailTemplateEventLabel("ready_for_shipping"),
    subject: "Ready for Shipping — {{order_number}}",
    body_html: shell(
      "Ready for Shipping",
      `<p style="margin:0 0 16px;font-size:16px;">Hello {{customer_name}},</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.65;">Your parcel for order <strong>{{order_number}}</strong> is packed and ready for dispatch.</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:${MUTED};">We are arranging shipment and will notify you once it is out for delivery.</p>
      ${summaryCard()}
      <p style="margin:24px 0 0;font-size:14px;"><a href="{{my_orders_url}}" style="color:${MAROON};font-weight:600;">Track your order</a></p>`
    )
  },
  {
    event_key: "out_for_delivery",
    name: emailTemplateEventLabel("out_for_delivery"),
    subject: "Out for Delivery — {{order_number}}",
    body_html: shell(
      "Out for Delivery",
      `<p style="margin:0 0 16px;font-size:16px;">Hello {{customer_name}},</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.65;">Great news — order <strong>{{order_number}}</strong> is out for delivery.</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:${MUTED};">Our delivery partner is on the way to your address.</p>
      <table width="100%" style="background:${CARD};border:1px solid ${BORDER};border-radius:12px;margin-bottom:16px;"><tr><td style="padding:16px;"><p style="margin:0 0 6px;font-size:14px;"><strong>Delivery method</strong> {{delivery_method}}</p><p style="margin:0 0 6px;font-size:14px;"><strong>Delivery staff</strong> {{delivery_staff_name}}</p><p style="margin:0 0 6px;font-size:14px;"><strong>Tracking</strong> {{tracking_number}}</p><p style="margin:0 0 6px;font-size:14px;"><strong>Amount</strong> {{amount}}</p></td></tr></table>
      <table width="100%" style="background:${CARD};border:1px solid ${BORDER};border-radius:12px;margin-bottom:16px;"><tr><td style="padding:16px;text-align:center;"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${GOLD};">Delivery OTP</p><p style="margin:0;font-size:28px;font-weight:700;letter-spacing:0.2em;color:${MAROON};">{{delivery_otp}}</p><p style="margin:10px 0 0;font-size:13px;line-height:1.5;color:${MUTED};">Share this code with the delivery staff to confirm handover.</p></td></tr></table>
      <table width="100%" style="background:${CARD};border:1px solid ${BORDER};border-radius:12px;"><tr><td style="padding:16px;"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${GOLD};">Delivering to</p><p style="margin:0;font-size:14px;line-height:1.6;">{{delivery_address_html}}</p></td></tr></table>
      <p style="margin:24px 0 0;font-size:14px;"><a href="{{my_orders_url}}" style="color:${MAROON};font-weight:600;">View order status</a></p>`
    )
  },
  {
    event_key: "order_delivered",
    name: emailTemplateEventLabel("order_delivered"),
    subject: "Order Delivered — {{order_number}}",
    body_html: shell(
      "Delivered",
      `<p style="margin:0 0 16px;font-size:16px;">Hello {{customer_name}},</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.65;">Your order <strong>{{order_number}}</strong> has been successfully delivered.</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:${MUTED};">We hope you love your purchase. Thank you for choosing {{store_name}}.</p>
      ${summaryCard()}
      <div style="margin:0 0 20px;">{{items_html}}</div>
      <p style="margin:0;font-size:15px;line-height:1.65;">We'd love your feedback — review your items from <a href="{{my_orders_url}}" style="color:${MAROON};font-weight:600;">My Orders</a>.</p>`
    )
  },
  {
    event_key: "order_cancelled",
    name: emailTemplateEventLabel("order_cancelled"),
    subject: "Order Cancelled — {{order_number}}",
    body_html: shell(
      "Order Cancelled",
      `<p style="margin:0 0 16px;font-size:16px;">Hello {{customer_name}},</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.65;">Your order <strong>{{order_number}}</strong> has been cancelled.</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:${MUTED};">If a payment was collected, any applicable refund will be processed according to our refund policy.</p>
      ${summaryCard()}
      <p style="margin:24px 0 0;font-size:14px;"><a href="{{my_orders_url}}" style="color:${MAROON};font-weight:600;">View order details</a></p>`
    )
  },
  {
    event_key: "delivery_assigned",
    name: emailTemplateEventLabel("delivery_assigned"),
    subject: "New Delivery Assigned — {{order_number}}",
    body_html: shell(
      "Delivery Assigned",
      `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hello {{delivery_staff_name}},</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.65;">A new delivery has been assigned to you.</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:${MUTED};">Please check your Fashion Point delivery orders for complete details.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:${CARD};border:1px solid ${BORDER};border-radius:12px;"><tr><td style="padding:16px 18px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${GOLD};">Assignment</p>
        <p style="margin:0 0 6px;font-size:14px;"><strong>Order</strong> {{order_number}}</p>
        <p style="margin:0 0 6px;font-size:14px;"><strong>Customer</strong> {{customer_name}}</p>
        <p style="margin:0 0 6px;font-size:14px;"><strong>Phone</strong> {{customer_phone}}</p>
        <p style="margin:0 0 6px;font-size:14px;"><strong>Order date</strong> {{order_date}}</p>
        <p style="margin:0 0 6px;font-size:14px;"><strong>Amount</strong> {{amount}}</p>
        <p style="margin:0 0 6px;font-size:14px;"><strong>Delivery method</strong> {{delivery_method}}</p>
        {{tracking_number_line}}
      </td></tr></table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:${CARD};border:1px solid ${BORDER};border-radius:12px;"><tr><td style="padding:16px 18px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${GOLD};">Delivery address</p>
        <p style="margin:0;font-size:14px;line-height:1.6;">{{delivery_address_html}}</p>
      </td></tr></table>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto 8px;"><tr>
        <td style="border-radius:10px;background:${MAROON};">
          <a href="{{mark_delivery_url}}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.04em;">MARK DELIVERY</a>
        </td>
      </tr></table>
      <p style="margin:12px 0 0;font-size:13px;line-height:1.5;color:${MUTED};text-align:center;">You will enter the customer&apos;s 4-digit delivery OTP to confirm.</p>
      <p style="margin:20px 0 0;font-size:14px;line-height:1.6;text-align:center;"><a href="{{delivery_orders_url}}" style="color:${MAROON};font-weight:600;">Open delivery orders</a></p>
      <p style="margin:20px 0 0;font-size:14px;line-height:1.6;">Regards,<br/>{{store_name}}</p>`
    )
  }
];

export function defaultTemplateForEvent(
  eventKey: EmailTemplateEventKey
): DefaultEmailTemplate {
  const found = DEFAULT_EMAIL_TEMPLATES.find((row) => row.event_key === eventKey);
  if (!found) {
    throw new Error(`Missing default email template for ${eventKey}`);
  }
  return found;
}

export function allDefaultEventKeys(): EmailTemplateEventKey[] {
  return [...EMAIL_TEMPLATE_EVENTS];
}
