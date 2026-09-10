import { render } from "@react-email/render";
import {
  customerName,
  customerPhone,
  formatCurrency,
  paymentMethodLabel
} from "@/lib/orders/admin-orders";
import { normalizeOrderItems } from "@/lib/orders/order-items";
import { AdminNewOrderEmail, type AdminNewOrderEmailProps } from "@/emails/AdminNewOrderEmail";
import { resolveCustomerEmailBranchCopy } from "@/lib/server/notifications/customer-email-branch-copy";
import {
  adminDashboardEmailUrl
} from "@/lib/server/notifications/email-app-url";
import { getStoreInformation } from "@/lib/settings/store-information";
import { STORE_NAME } from "@/lib/site-config";
import type { OrderEmailActionUrls } from "@/lib/server/order-actions/tokens";
import type { Order } from "@/types";

const PREHEADER = "New paid order received. Review and approve the order.";

function emailPaymentMethodLabel(method: string | undefined): string {
  if (!method || method.toLowerCase() === "cod") return "Online Payment";
  const label = paymentMethodLabel(method);
  return label === "COD" ? "Online Payment" : label;
}

function customerEmail(order: Order): string {
  return order.shipping_address?.email?.trim() || order.guest_email?.trim() || "—";
}

function formatShippingAddressLines(order: Order): string {
  const a = order.shipping_address;
  if (!a) return "—";

  const parts = [
    a.house_flat || a.address_line1,
    a.street || a.address_line2,
    a.landmark,
    a.city,
    a.state,
    a.pincode || a.postal_code
  ].filter((part) => typeof part === "string" && part.trim());

  return parts.length ? parts.join("\n") : "—";
}

export function mapOrderToAdminNewOrderEmailProps(
  order: Order,
  actionUrls: OrderEmailActionUrls
): AdminNewOrderEmailProps {
  const lines = normalizeOrderItems(order.items);
  const line = lines[0];

  return {
    preheader: PREHEADER,
    orderId: order.order_number,
    paymentMethod: emailPaymentMethodLabel(order.payment_method),
    paymentStatusPaid: (order.payment_status ?? "").toLowerCase() === "paid",
    totalAmount: formatCurrency(Number(order.total)),
    product: line
      ? {
          name: line.name,
          size: line.size || "—",
          color: line.color || "—",
          quantity: line.quantity,
          price: formatCurrency(line.price)
        }
      : null,
    extraProductCount: Math.max(0, lines.length - 1),
    customerName: customerName(order),
    customerPhone: customerPhone(order),
    customerEmail: customerEmail(order),
    shippingAddressText: formatShippingAddressLines(order),
    // Must be the tokenized /api/order-actions/approve URL — NOT the admin order page.
    approveUrl: actionUrls.approveUrl,
    dashboardUrl: adminDashboardEmailUrl(),
    storeName: STORE_NAME,
    locationLine: STORE_NAME
  };
}

export async function buildAdminNewOrderPremiumEmail(
  order: Order,
  actionUrls: OrderEmailActionUrls
): Promise<{ subject: string; html: string }> {
  const [store, customerCopy] = await Promise.all([
    getStoreInformation(),
    resolveCustomerEmailBranchCopy(order.branch_id)
  ]);
  const storeName = store.storeName.trim() || STORE_NAME;
  const props = {
    ...mapOrderToAdminNewOrderEmailProps(order, actionUrls),
    storeName,
    locationLine: customerCopy.locationLine
  };
  const html = await render(AdminNewOrderEmail(props));

  console.info("[admin-new-order-email] approve CTA", {
    orderId: order.id,
    orderNumber: order.order_number,
    approvePath: (() => {
      try {
        return new URL(props.approveUrl).pathname + new URL(props.approveUrl).search.slice(0, 24);
      } catch {
        return "invalid-url";
      }
    })()
  });

  return {
    subject: `🔔 New Order Alert — ${order.order_number}`,
    html
  };
}
