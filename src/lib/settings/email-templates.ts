import type { Order } from "@/types";

/** Stable event keys for Settings → Email Templates + order workflow sends. */
export const EMAIL_TEMPLATE_EVENTS = [
  "order_confirmation",
  "ready_for_shipping",
  "out_for_delivery",
  "order_delivered",
  "order_cancelled",
  "delivery_assigned"
] as const;

export type EmailTemplateEventKey = (typeof EMAIL_TEMPLATE_EVENTS)[number];

export type EmailTemplateRow = {
  id: string;
  event_key: EmailTemplateEventKey;
  name: string;
  subject: string;
  body_html: string;
  is_active: boolean;
  updated_at: string | null;
};

export const EMAIL_TEMPLATE_VARIABLES: Array<{
  key: string;
  label: string;
  html?: boolean;
}> = [
  { key: "customer_name", label: "Customer name" },
  { key: "customer_phone", label: "Customer phone" },
  { key: "order_number", label: "Order number" },
  { key: "order_date", label: "Order date" },
  { key: "amount", label: "Order amount" },
  { key: "payment_method", label: "Payment method" },
  { key: "payment_status", label: "Payment status" },
  { key: "delivery_address", label: "Delivery address (plain text)" },
  { key: "delivery_address_html", label: "Delivery address (HTML)", html: true },
  { key: "delivery_method", label: "Delivery method" },
  { key: "delivery_staff_name", label: "Delivery staff name" },
  { key: "tracking_number", label: "Tracking number" },
  { key: "tracking_number_line", label: "Tracking number line (HTML)", html: true },
  { key: "delivery_otp", label: "Delivery OTP" },
  { key: "store_name", label: "Store name" },
  { key: "items_html", label: "Order items (HTML)", html: true },
  { key: "my_orders_url", label: "My Orders URL" },
  { key: "delivery_orders_url", label: "Delivery Orders URL" },
  { key: "mark_delivery_url", label: "Mark Delivery action URL" }
];

export function isEmailTemplateEventKey(value: unknown): value is EmailTemplateEventKey {
  return (
    typeof value === "string" &&
    (EMAIL_TEMPLATE_EVENTS as readonly string[]).includes(value)
  );
}

export function emailTemplateEventLabel(eventKey: string): string {
  switch (eventKey) {
    case "order_confirmation":
      return "Order Confirmation";
    case "ready_for_shipping":
      return "Ready for Shipping";
    case "out_for_delivery":
      return "Out for Delivery";
    case "order_delivered":
      return "Order Delivered";
    case "order_cancelled":
      return "Order Cancelled";
    case "delivery_assigned":
      return "Delivery Assigned";
    default:
      return eventKey;
  }
}

/** Notification_logs event names for customer email dedup. */
export function customerEmailLogEventForTemplate(
  eventKey: EmailTemplateEventKey
): string {
  switch (eventKey) {
    case "order_confirmation":
      return "customer_order_confirmed";
    case "ready_for_shipping":
      return "customer_ready_for_shipping";
    case "out_for_delivery":
      return "customer_out_for_delivery";
    case "order_delivered":
      return "delivery_confirmation_email";
    case "order_cancelled":
      return "customer_order_cancelled";
    case "delivery_assigned":
      // Staff-facing; per-worker suffix added by notifyDeliveryWorkerAssigned.
      return "delivery_assigned";
  }
}

export type OrderEmailTemplateVars = Record<string, string>;

export type BuildOrderEmailTemplateVarsInput = {
  order: Order;
  storeName: string;
  deliveryStaffName?: string | null;
  myOrdersUrl: string;
  itemsHtml: string;
};
