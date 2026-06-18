import { customerName, customerPhone, formatCurrency } from "@/lib/orders/admin-orders";
import { normalizeOrderItems } from "@/lib/orders/order-items";
import { getEmailAppUrl } from "@/lib/server/notifications/email-app-url";
import type { Order } from "@/types";

export function buildAdminNewOrderContext(order: Order) {
  const item = normalizeOrderItems(order.items)[0];
  const appUrl = getEmailAppUrl();
  const adminOrdersUrl = appUrl ? `${appUrl}/admin/orders` : "/admin/orders";

  return {
    orderId: order.order_number,
    customerName: customerName(order),
    customerPhone: customerPhone(order),
    amount: formatCurrency(Number(order.total)),
    productName: item?.name ?? "Product",
    size: item?.size ?? "—",
    color: item?.color ?? "—",
    adminOrdersUrl
  };
}

export function buildAdminWhatsAppNewOrderMessage(order: Order): string {
  const ctx = buildAdminNewOrderContext(order);
  return [
    "🛍 Fashion Point",
    "",
    "NEW ORDER RECEIVED",
    "",
    `Order ID: ${ctx.orderId}`,
    "",
    `Customer: ${ctx.customerName}`,
    `Phone: ${ctx.customerPhone}`,
    "",
    `Amount: ${ctx.amount}`,
    "Payment: Paid",
    "",
    "Product:",
    ctx.productName,
    "",
    `Size: ${ctx.size}`,
    `Color: ${ctx.color}`,
    "",
    "View Orders:",
    ctx.adminOrdersUrl
  ].join("\n");
}

export function buildAdminSMSNewOrderMessage(order: Order): string {
  const ctx = buildAdminNewOrderContext(order);
  return [
    "Fashion Point",
    "",
    `New Order ${ctx.orderId}`,
    "",
    `${ctx.amount} Paid`,
    "",
    "Customer:",
    ctx.customerName,
    "",
    ctx.customerPhone
  ].join("\n");
}
